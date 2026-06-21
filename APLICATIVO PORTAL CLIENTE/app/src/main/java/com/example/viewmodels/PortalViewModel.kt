package com.example.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.services.ApiClient
import com.example.services.PortalFcmManager
import com.example.services.SessionManager
import com.example.types.*
import com.example.ui.theme.BrandThemeHolder
import com.example.ui.theme.DynamicBrandColors
import com.example.ui.theme.ThemeMode
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.net.UnknownHostException

class PortalViewModel(application: Application) : AndroidViewModel(application) {
    private val sessionManager = SessionManager(application)
    private val api = ApiClient.getApi(application)
    private val moshi = ApiClient.moshi

    private val _isLoggedIn = MutableStateFlow(sessionManager.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage

    private val _dashboard = MutableStateFlow<PortalDashboard?>(null)
    val dashboard: StateFlow<PortalDashboard?> = _dashboard

    private val _currentQuote = MutableStateFlow<PortalQuoteRow?>(null)
    val currentQuote: StateFlow<PortalQuoteRow?> = _currentQuote

    private val _currentServiceOrder = MutableStateFlow<ServiceOrder?>(null)
    val currentServiceOrder: StateFlow<ServiceOrder?> = _currentServiceOrder

    private val _notifications = MutableStateFlow<List<PortalNotification>>(emptyList())
    val notifications: StateFlow<List<PortalNotification>> = _notifications

    private val _vehicles = MutableStateFlow<List<Vehicle>>(emptyList())
    val vehicles: StateFlow<List<Vehicle>> = _vehicles

    private val _publicQuote = MutableStateFlow<PublicQuoteResponse?>(null)
    val publicQuote: StateFlow<PublicQuoteResponse?> = _publicQuote

    private val _themeMode = MutableStateFlow(readThemeMode())
    val themeMode: StateFlow<ThemeMode> = _themeMode

    private val _brandColors = MutableStateFlow(DynamicBrandColors.defaults())
    val brandColors: StateFlow<DynamicBrandColors> = _brandColors

    private var pollingJob: Job? = null

    private val dashboardAdapter = moshi.adapter(PortalDashboard::class.java)
    @Suppress("UNCHECKED_CAST")
    private val notificationsAdapter = moshi.adapter<List<PortalNotification>>(
        com.squareup.moshi.Types.newParameterizedType(List::class.java, PortalNotification::class.java)
    )

    init {
        loadPublicBranding()
        if (_isLoggedIn.value) {
            loadAllData()
            startPolling()
        }
    }

    private fun readThemeMode(): ThemeMode {
        return when (sessionManager.getThemeMode()) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    fun toggleThemeMode() {
        val next = when (_themeMode.value) {
            ThemeMode.LIGHT -> ThemeMode.DARK
            ThemeMode.DARK -> ThemeMode.LIGHT
            ThemeMode.SYSTEM -> ThemeMode.DARK
        }
        setThemeMode(next)
    }

    fun setThemeMode(mode: ThemeMode) {
        _themeMode.value = mode
        sessionManager.setThemeMode(
            when (mode) {
                ThemeMode.LIGHT -> "light"
                ThemeMode.DARK -> "dark"
                ThemeMode.SYSTEM -> "system"
            }
        )
        updateBrandColors(_dashboard.value?.organization, null)
    }

    fun syncThemeWithSystem(isSystemDark: Boolean) {
        if (_themeMode.value == ThemeMode.SYSTEM) {
            updateBrandColors(_dashboard.value?.organization, isSystemDark)
        }
    }

    private fun isDarkResolved(systemDark: Boolean?): Boolean {
        return when (_themeMode.value) {
            ThemeMode.LIGHT -> false
            ThemeMode.DARK -> true
            ThemeMode.SYSTEM -> systemDark ?: false
        }
    }

    private fun updateBrandColors(org: Organization?, systemDark: Boolean?) {
        val isDark = isDarkResolved(systemDark)
        val colors = DynamicBrandColors.fromOrganization(org, isDark)
        _brandColors.value = colors
        BrandThemeHolder.colors = colors
    }

    fun loadPublicBranding() {
        viewModelScope.launch {
            try {
                val branding = api.getPublicBranding()
                if (_dashboard.value == null) {
                    val isDark = _themeMode.value == ThemeMode.DARK
                    val colors = DynamicBrandColors.fromPublicBranding(
                        branding.primaryColor,
                        branding.accentColor,
                        isDark,
                    )
                    _brandColors.value = colors
                    BrandThemeHolder.colors = colors
                }
            } catch (e: Exception) {
                Log.d("PortalViewModel", "Public branding unavailable")
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun login(cpf: String, plate: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            _isOffline.value = false
            try {
                val cleanCpf = cpf.filter { it.isDigit() }
                val cleanPlate = plate.replace("[^a-zA-Z0-9]".toRegex(), "").uppercase()

                if (cleanCpf.length < 11) {
                    _errorMessage.value = "Dados inválidos. Confira o CPF (mínimo 11 dígitos)."
                    _isLoading.value = false
                    return@launch
                }
                if (cleanPlate.length < 6) {
                    _errorMessage.value = "Dados inválidos. Confira a placa do veículo."
                    _isLoading.value = false
                    return@launch
                }

                val response = api.login(LoginRequest(cpf = cleanCpf, plate = cleanPlate))
                saveSessionAndLoad(response, onSuccess)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Login error", e)
                _errorMessage.value = if (e is UnknownHostException) {
                    "Sem conexão com a internet."
                } else {
                    "Dados inválidos. Confira o CPF e a placa."
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loginByAccessToken(token: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val response = api.accessByToken(token)
                saveSessionAndLoad(response, onSuccess)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Access token error", e)
                val msg = if (e is UnknownHostException) {
                    "Sem conexão com a internet."
                } else {
                    "Link inválido ou expirado."
                }
                _errorMessage.value = msg
                onError(msg)
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun saveSessionAndLoad(response: LoginResponse, onSuccess: () -> Unit) {
        sessionManager.saveSession(
            token = response.accessToken,
            customerName = response.customerName,
            plate = response.plate,
            organizationName = response.organizationName
        )
        _isLoggedIn.value = true
        _isOffline.value = false
        loadAllData(showLoading = true)
        startPolling()
        PortalFcmManager.registerWithApi(getApplication())
        onSuccess()
    }

    fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive && _isLoggedIn.value) {
                delay(30_000)
                refreshSilently()
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    fun loadAllData(showLoading: Boolean = true) {
        if (!_isLoggedIn.value) return
        viewModelScope.launch {
            if (showLoading) _isLoading.value = true
            _errorMessage.value = null
            _isOffline.value = false
            try {
                val dashboardData = api.getDashboard()
                _dashboard.value = dashboardData
                updateBrandColors(dashboardData.organization, null)
                sessionManager.cacheDashboard(dashboardAdapter.toJson(dashboardData))

                val notifs = api.getNotifications()
                _notifications.value = notifs
                sessionManager.cacheNotifications(notificationsAdapter.toJson(notifs))

                val vehs = api.getVehicles()
                _vehicles.value = vehs

                _isOffline.value = false
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading data, loading cache", e)
                _isOffline.value = true
                loadFromCache()
            } finally {
                if (showLoading) _isLoading.value = false
            }
        }
    }

    private fun refreshSilently() {
        if (!_isLoggedIn.value) return
        viewModelScope.launch {
            try {
                val dashboardData = api.getDashboard()
                _dashboard.value = dashboardData
                updateBrandColors(dashboardData.organization, null)
                sessionManager.cacheDashboard(dashboardAdapter.toJson(dashboardData))

                val notifs = api.getNotifications()
                _notifications.value = notifs
                sessionManager.cacheNotifications(notificationsAdapter.toJson(notifs))

                _isOffline.value = false
            } catch (e: Exception) {
                Log.d("PortalViewModel", "Silent refresh failed")
            }
        }
    }

    private fun loadFromCache() {
        try {
            val cachedJson = sessionManager.getCachedDashboard()
            if (!cachedJson.isNullOrEmpty()) {
                val cachedData = dashboardAdapter.fromJson(cachedJson)
                _dashboard.value = cachedData
                cachedData?.organization?.let { updateBrandColors(it, null) }
            }

            val cachedNotifsJson = sessionManager.getCachedNotifications()
            if (!cachedNotifsJson.isNullOrEmpty()) {
                val cachedNotifs = notificationsAdapter.fromJson(cachedNotifsJson)
                if (cachedNotifs != null) {
                    _notifications.value = cachedNotifs
                }
            }
        } catch (e: Exception) {
            Log.e("PortalViewModel", "Error reading cache", e)
        }
    }

    fun loadServiceOrderDetails(soId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val order = api.getServiceOrder(soId)
                _currentServiceOrder.value = order
                _isOffline.value = false
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading service order details", e)
                if (e is UnknownHostException) {
                    _isOffline.value = true
                    val localOrder = _dashboard.value?.serviceOrders?.find { it.id == soId }
                    if (localOrder != null) {
                        _currentServiceOrder.value = localOrder
                    } else {
                        _errorMessage.value = "Sem conexão com a internet."
                    }
                } else {
                    _errorMessage.value = "Não foi possível carregar as informações da OS."
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadQuoteDetails(quoteId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val quote = api.getQuote(quoteId)
                _currentQuote.value = quote
                _isOffline.value = false
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading quote details", e)
                if (e is UnknownHostException) {
                    _isOffline.value = true
                    val localQuote = _dashboard.value?.quotes?.find { it.id == quoteId }
                    if (localQuote != null) {
                        _currentQuote.value = localQuote
                    } else {
                        _errorMessage.value = "Sem conexão com a internet."
                    }
                } else {
                    _errorMessage.value = "Orçamento ainda não disponível."
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadPublicQuote(token: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            _publicQuote.value = null
            try {
                _publicQuote.value = api.getPublicQuote(token)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading public quote", e)
                _errorMessage.value = "Link inválido ou expirado."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun approveQuote(quoteId: String, lineIdsAndApprovals: List<Pair<String, Boolean>>?, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val approvedLinesList = lineIdsAndApprovals?.map { ApprovedLine(it.first, it.second) }
                val request = ApproveQuoteRequest(lines = approvedLinesList, comment = comment)
                val updatedQuote = api.approveQuote(quoteId, request)
                _currentQuote.value = updatedQuote
                loadAllData(showLoading = false)
                onComplete(true)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error approving quote", e)
                _errorMessage.value = "Não foi possível aprovar o orçamento. Tente novamente."
                onComplete(false)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun rejectQuote(quoteId: String, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val request = RejectQuoteRequest(comment = comment)
                val updatedQuote = api.rejectQuote(quoteId, request)
                _currentQuote.value = updatedQuote
                loadAllData(showLoading = false)
                onComplete(true)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error rejecting quote", e)
                _errorMessage.value = "Não foi possível rejeitar o orçamento. Tente novamente."
                onComplete(false)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun approvePublicQuote(token: String, lineIdsAndApprovals: List<Pair<String, Boolean>>?, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val approvedLinesList = lineIdsAndApprovals?.map { ApprovedLine(it.first, it.second) }
                val request = ApproveQuoteRequest(lines = approvedLinesList, comment = comment)
                val updated = api.approvePublicQuote(token, request)
                _publicQuote.value = _publicQuote.value?.copy(quote = updated)
                onComplete(true)
            } catch (e: Exception) {
                _errorMessage.value = "Não foi possível aprovar o orçamento."
                onComplete(false)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun rejectPublicQuote(token: String, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val request = RejectQuoteRequest(comment = comment)
                val updated = api.rejectPublicQuote(token, request)
                _publicQuote.value = _publicQuote.value?.copy(quote = updated)
                onComplete(true)
            } catch (e: Exception) {
                _errorMessage.value = "Não foi possível recusar o orçamento."
                onComplete(false)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun switchVehicle(vehicleId: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val response = api.switchVehicle(SwitchVehicleRequest(vehicleId))
                sessionManager.saveSession(
                    token = response.accessToken,
                    customerName = response.customerName,
                    plate = response.plate,
                    organizationName = response.organizationName
                )
                _isOffline.value = false
                loadAllData()
                onComplete()
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error switching vehicle", e)
                _errorMessage.value = "Não foi possível alternar veículo."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun markNotificationAsRead(id: String) {
        viewModelScope.launch {
            try {
                api.markNotificationRead(id)
                _notifications.value = _notifications.value.map {
                    if (it.id == id) it.copy(read = true) else it
                }
                sessionManager.cacheNotifications(notificationsAdapter.toJson(_notifications.value))
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error marking notification as read", e)
            }
        }
    }

    fun markAllNotificationsAsRead() {
        viewModelScope.launch {
            try {
                api.markAllNotificationsRead()
                _notifications.value = _notifications.value.map { it.copy(read = true) }
                sessionManager.cacheNotifications(notificationsAdapter.toJson(_notifications.value))
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error marking all read", e)
            }
        }
    }

    fun logout(onComplete: () -> Unit) {
        stopPolling()
        sessionManager.clearSession()
        _isLoggedIn.value = false
        _dashboard.value = null
        _notifications.value = emptyList()
        _vehicles.value = emptyList()
        _currentQuote.value = null
        _currentServiceOrder.value = null
        _publicQuote.value = null
        onComplete()
    }

    fun getCustomerName() = sessionManager.getCustomerName()
    fun getPlate() = sessionManager.getPlate()
    fun getOrganizationName() = sessionManager.getOrganizationName()
}
