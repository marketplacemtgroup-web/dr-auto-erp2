package com.example.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.lib.ApiErrorMapper
import com.example.lib.PortalStatus
import com.example.lib.QuoteLineHelper
import com.example.services.ApiClient
import com.example.services.PortalFcmManager
import com.example.services.PortalNotificationHelper
import com.example.services.PortalNotificationPermission
import com.example.services.PortalRefreshBus
import com.example.services.SessionManager
import com.example.types.*
import com.example.ui.theme.BrandThemeHolder
import com.example.ui.theme.DynamicBrandColors
import com.example.ui.theme.ThemeMode
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

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

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private val _initialLoadComplete = MutableStateFlow(false)
    val initialLoadComplete: StateFlow<Boolean> = _initialLoadComplete

    private val _appointments = MutableStateFlow<List<PortalAppointment>>(emptyList())
    val appointments: StateFlow<List<PortalAppointment>> = _appointments

    private val _appointmentActionLoading = MutableStateFlow(false)
    val appointmentActionLoading: StateFlow<Boolean> = _appointmentActionLoading

    private val _dismissedQuoteIds = MutableStateFlow<Set<String>>(emptySet())
    val dismissedQuoteIds: StateFlow<Set<String>> = _dismissedQuoteIds

    private val _quoteRespondingId = MutableStateFlow<String?>(null)
    val quoteRespondingId: StateFlow<String?> = _quoteRespondingId

    private val _publicBrandingLogoUrl = MutableStateFlow<String?>(null)
    val publicBrandingLogoUrl: StateFlow<String?> = _publicBrandingLogoUrl

    private var knownNotificationIds = mutableSetOf<String>()
    private var notificationsTrayInitialized = false

    private val dashboardAdapter = moshi.adapter(PortalDashboard::class.java)
    @Suppress("UNCHECKED_CAST")
    private val notificationsAdapter = moshi.adapter<List<PortalNotification>>(
        com.squareup.moshi.Types.newParameterizedType(List::class.java, PortalNotification::class.java)
    )

    init {
        loadPublicBranding()
        viewModelScope.launch {
            PortalRefreshBus.requests.collectLatest {
                if (_isLoggedIn.value) loadAllData(showLoading = false)
            }
        }
        if (_isLoggedIn.value) {
            loadFromCache()
            loadAllData()
            registerPushTokenIfAllowed()
        }
    }

    private fun registerPushTokenIfAllowed() {
        viewModelScope.launch {
            if (PortalNotificationPermission.isGranted(getApplication())) {
                PortalFcmManager.registerWithApi(getApplication())
            }
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
                _publicBrandingLogoUrl.value = branding.logoUrl
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
                _errorMessage.value = ApiErrorMapper.map(e, "login")
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
                val msg = ApiErrorMapper.map(e, "access")
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
        registerPushTokenIfAllowed()
        onSuccess()
    }

    fun registerPushToken() {
        registerPushTokenIfAllowed()
    }

    fun refreshFcmToken() {
        registerPushTokenIfAllowed()
    }

    fun loadAllData(showLoading: Boolean = true, includeNotifications: Boolean = false) {
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

                if (includeNotifications) {
                    loadNotificationsInternal()
                }

                val vehs = api.getVehicles()
                _vehicles.value = vehs

                _isOffline.value = false
                _errorMessage.value = null
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading data", e)
                val hadCache = hasCachedDashboard()
                loadFromCache()
                if (_dashboard.value == null) {
                    _isOffline.value = false
                    _errorMessage.value = ApiErrorMapper.map(e, "dashboard")
                } else {
                    _isOffline.value = true
                    if (!hadCache) {
                        _errorMessage.value = ApiErrorMapper.map(e, "dashboard")
                    }
                }
            } finally {
                if (showLoading) _isLoading.value = false
                _initialLoadComplete.value = true
            }
        }
    }

    fun loadNotifications() {
        if (!_isLoggedIn.value) return
        viewModelScope.launch {
            try {
                loadNotificationsInternal()
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading notifications", e)
            }
        }
    }

    private suspend fun loadNotificationsInternal() {
        val notifs = api.getNotifications()
        _notifications.value = notifs
        sessionManager.cacheNotifications(notificationsAdapter.toJson(notifs))
        notifyTrayForNewInboxItems(notifs)
    }

    fun logout(onComplete: () -> Unit) {
        resetNotificationTrayTracking()
        sessionManager.clearSession()
        _isLoggedIn.value = false
        _dashboard.value = null
        _notifications.value = emptyList()
        _vehicles.value = emptyList()
        _currentQuote.value = null
        _currentServiceOrder.value = null
        _publicQuote.value = null
        _initialLoadComplete.value = false
        _errorMessage.value = null
        _dismissedQuoteIds.value = emptySet()
        _quoteRespondingId.value = null
        onComplete()
    }

    private fun notifyTrayForNewInboxItems(notifs: List<PortalNotification>) {
        val newUnread = notifs.filter { !it.read && it.id !in knownNotificationIds }
        if (notificationsTrayInitialized && newUnread.isNotEmpty()) {
            val latest = newUnread.maxByOrNull { it.createdAt } ?: return
            PortalNotificationHelper.showFromPortalNotification(
                context = getApplication(),
                notificationId = latest.id,
                title = latest.title,
                body = latest.body,
                serviceOrderId = latest.serviceOrderId,
                quoteId = latest.quoteId,
                type = latest.type,
            )
        }
        knownNotificationIds = notifs.map { it.id }.toMutableSet()
        notificationsTrayInitialized = true
    }

    private fun resetNotificationTrayTracking() {
        knownNotificationIds.clear()
        notificationsTrayInitialized = false
    }

    private fun hasCachedDashboard(): Boolean =
        !sessionManager.getCachedDashboard().isNullOrEmpty()

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
            _currentServiceOrder.value = null
            try {
                val order = api.getServiceOrder(soId)
                _currentServiceOrder.value = order
                _isOffline.value = false
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading service order details", e)
                _errorMessage.value = ApiErrorMapper.map(e, "serviceOrder")
                if (_dashboard.value?.serviceOrders?.none { it.id == soId } != false) {
                    _isOffline.value = e is java.net.UnknownHostException
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
                if (e is java.net.UnknownHostException) {
                    _isOffline.value = true
                    val localQuote = _dashboard.value?.quotes?.find { it.id == quoteId }
                    if (localQuote != null) {
                        _currentQuote.value = localQuote
                    } else {
                        _errorMessage.value = ApiErrorMapper.map(e, "quote")
                    }
                } else {
                    _errorMessage.value = ApiErrorMapper.map(e, "quote")
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
                _errorMessage.value = ApiErrorMapper.map(e, "publicQuote")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun approveQuote(quoteId: String, lineIdsAndApprovals: List<Pair<String, Boolean>>?, comment: String?, onComplete: (Boolean) -> Unit) {
        respondToQuote(quoteId, approve = true, lineIdsAndApprovals, comment, onComplete)
    }

    fun rejectQuote(quoteId: String, comment: String?, onComplete: (Boolean) -> Unit) {
        respondToQuote(quoteId, approve = false, null, comment, onComplete)
    }

    private fun respondToQuote(
        quoteId: String,
        approve: Boolean,
        lineIdsAndApprovals: List<Pair<String, Boolean>>?,
        comment: String?,
        onComplete: (Boolean) -> Unit,
    ) {
        viewModelScope.launch {
            _errorMessage.value = null
            _dismissedQuoteIds.value = _dismissedQuoteIds.value + quoteId
            markQuoteRespondedLocally(quoteId, approve)
            _quoteRespondingId.value = quoteId

            val apiJob = async {
                try {
                    if (approve) {
                        val quoteLines = _currentQuote.value?.takeIf { it.id == quoteId }?.lines
                            ?: _dashboard.value?.quotes?.find { it.id == quoteId }?.lines
                            ?: emptyList()
                        val resolvedLines = lineIdsAndApprovals
                            ?: QuoteLineHelper.buildApprovePayload(quoteLines)
                        val approvedLinesList = resolvedLines?.map { ApprovedLine(it.first, it.second) }
                        val request = when {
                            approvedLinesList.isNullOrEmpty() -> ApproveQuoteRequest(comment = comment)
                            else -> ApproveQuoteRequest(lines = approvedLinesList, comment = comment)
                        }
                        val updatedQuote = api.approveQuote(quoteId, request)
                        _currentQuote.value = updatedQuote
                    } else {
                        val updatedQuote = api.rejectQuote(quoteId, RejectQuoteRequest(comment = comment))
                        _currentQuote.value = updatedQuote
                    }
                    true
                } catch (e: Exception) {
                    Log.e("PortalViewModel", "Error responding to quote", e)
                    _errorMessage.value = if (approve) {
                        ApiErrorMapper.map(e, "approveQuote")
                    } else {
                        "Não foi possível recusar o orçamento. Tente novamente."
                    }
                    false
                }
            }

            delay(3_000)
            loadAllData(showLoading = false)
            val success = apiJob.await()
            _quoteRespondingId.value = null

            if (!success) {
                _dismissedQuoteIds.value = _dismissedQuoteIds.value - quoteId
            }

            val stillPending = _dashboard.value?.quotes?.any {
                it.id == quoteId && PortalStatus.quoteNeedsResponse(it)
            } == true
            if (!stillPending) {
                _dismissedQuoteIds.value = _dismissedQuoteIds.value - quoteId
            }

            onComplete(success)
        }
    }

    private fun markQuoteRespondedLocally(quoteId: String, approve: Boolean) {
        val dash = _dashboard.value ?: return
        val newStatus = if (approve) "APPROVED" else "REJECTED"
        _dashboard.value = dash.copy(
            quotes = dash.quotes.map { quote ->
                if (quote.id != quoteId) quote
                else quote.copy(
                    status = newStatus,
                    canRespond = false,
                    pendingLineCount = 0,
                    lines = quote.lines.map { line ->
                        when (line.approved) {
                            null -> line.copy(approved = approve)
                            else -> line
                        }
                    },
                )
            },
        )
    }

    fun visiblePendingQuotes(quotes: List<PortalQuoteRow>): List<PortalQuoteRow> =
        quotes.filter { PortalStatus.quoteNeedsResponse(it) && it.id !in _dismissedQuoteIds.value }

    fun approvePublicQuote(token: String, lineIdsAndApprovals: List<Pair<String, Boolean>>?, comment: String?, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val quoteLines = _publicQuote.value?.quote?.lines ?: emptyList()
                val resolvedLines = lineIdsAndApprovals
                    ?: QuoteLineHelper.buildApprovePayload(quoteLines)
                val approvedLinesList = resolvedLines?.map { ApprovedLine(it.first, it.second) }
                val request = when {
                    approvedLinesList.isNullOrEmpty() -> ApproveQuoteRequest(comment = comment)
                    else -> ApproveQuoteRequest(lines = approvedLinesList, comment = comment)
                }
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

    fun loadAppointments() {
        viewModelScope.launch {
            try {
                _appointments.value = api.getAppointments()
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error loading appointments", e)
                _errorMessage.value = ApiErrorMapper.map(e, "appointments")
            }
        }
    }

    fun createAppointment(
        scheduledAtIso: String,
        requestedNotes: String?,
        onComplete: (Boolean) -> Unit,
    ) {
        viewModelScope.launch {
            _appointmentActionLoading.value = true
            try {
                api.createAppointment(
                    CreatePortalAppointmentRequest(
                        scheduledAt = scheduledAtIso,
                        durationMinutes = 60,
                        requestedNotes = requestedNotes?.takeIf { it.isNotBlank() },
                    )
                )
                loadAppointments()
                loadAllData(showLoading = false)
                onComplete(true)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error creating appointment", e)
                _errorMessage.value = ApiErrorMapper.map(e, "createAppointment")
                onComplete(false)
            } finally {
                _appointmentActionLoading.value = false
            }
        }
    }

    fun cancelAppointment(id: String, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _appointmentActionLoading.value = true
            try {
                api.cancelAppointment(id, CancelPortalAppointmentRequest())
                loadAppointments()
                loadAllData(showLoading = false)
                onComplete(true)
            } catch (e: Exception) {
                Log.e("PortalViewModel", "Error cancelling appointment", e)
                _errorMessage.value = ApiErrorMapper.map(e, "cancelAppointment")
                onComplete(false)
            } finally {
                _appointmentActionLoading.value = false
            }
        }
    }

    fun getCustomerName() = sessionManager.getCustomerName()
    fun getPlate() = sessionManager.getPlate()
    fun getOrganizationName() = sessionManager.getOrganizationName()
}
