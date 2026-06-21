package com.example.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.services.ApiClient
import com.example.services.SessionManager
import com.example.types.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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

    private val dashboardAdapter = moshi.adapter(PortalDashboard::class.java)
    @Suppress("UNCHECKED_CAST")
    private val notificationsAdapter = moshi.adapter<List<PortalNotification>>(
        com.squareup.moshi.Types.newParameterizedType(List::class.java, PortalNotification::class.java)
    )

    init {
        if (_isLoggedIn.value) {
            loadAllData()
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
                // Normalize document and license plate
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
                sessionManager.saveSession(
                    token = response.accessToken,
                    customerName = response.customerName,
                    plate = response.plate,
                    organizationName = response.organizationName
                )
                _isLoggedIn.value = true
                _isOffline.value = false
                loadAllData()
                onSuccess()
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Login error", e)
                if (e is UnknownHostException) {
                    _errorMessage.value = "Sem conexão com a internet."
                } else {
                    _errorMessage.value = "Dados inválidos. Confira o CPF e a placa."
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadAllData() {
        if (!isLoggedIn.value) return
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            _isOffline.value = false
            try {
                // Load Dashboard
                val dashboardData = api.getDashboard()
                _dashboard.value = dashboardData
                // Save JSON cache
                val json = dashboardAdapter.toJson(dashboardData)
                sessionManager.cacheDashboard(json)

                // Load Notifications
                val notifs = api.getNotifications()
                _notifications.value = notifs
                val notifsJson = notificationsAdapter.toJson(notifs)
                sessionManager.cacheNotifications(notifsJson)

                // Load Vehicles
                val vehs = api.getVehicles()
                _vehicles.value = vehs

                _isOffline.value = false
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading data, loading cache", e)
                _isOffline.value = true
                loadFromCache()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun loadFromCache() {
        try {
            val cachedJson = sessionManager.getCachedDashboard()
            if (!cachedJson.isNullOrEmpty()) {
                val cachedData = dashboardAdapter.fromJson(cachedJson)
                _dashboard.value = cachedData
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
                    // Fallback to active order from cached dashboard if IDs match
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
                    // Fallback to cached quote in dashboard
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

    fun approveQuote(quoteId: String, lineIdsAndApprovals: List<Pair<String, Boolean>>?, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val approvedLinesList = lineIdsAndApprovals?.map { ApprovedLine(it.first, it.second) }
                val request = ApproveQuoteRequest(lines = approvedLinesList, comment = comment)
                val updatedQuote = api.approveQuote(quoteId, request)
                _currentQuote.value = updatedQuote
                
                // Refresh dashboard to maintain consistency
                loadAllData()
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
                
                // Refresh dashboard
                loadAllData()
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
                // Update local notifications list
                _notifications.value = _notifications.value.map {
                    if (it.id == id) it.copy(read = true) else it
                }
                // Update cache
                val notifsJson = notificationsAdapter.toJson(_notifications.value)
                sessionManager.cacheNotifications(notifsJson)
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
                val notifsJson = notificationsAdapter.toJson(_notifications.value)
                sessionManager.cacheNotifications(notifsJson)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error marking all read", e)
            }
        }
    }

    fun logout(onComplete: () -> Unit) {
        sessionManager.clearSession()
        _isLoggedIn.value = false
        _dashboard.value = null
        _notifications.value = emptyList()
        _vehicles.value = emptyList()
        _currentQuote.value = null
        _currentServiceOrder.value = null
        onComplete()
    }

    // Get metadata directly from active state
    fun getCustomerName() = sessionManager.getCustomerName()
    fun getPlate() = sessionManager.getPlate()
    fun getOrganizationName() = sessionManager.getOrganizationName()
}
