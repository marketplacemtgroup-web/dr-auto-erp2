package com.example.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.Branding
import com.example.data.*
import com.example.data.api.CommissionRuleDto
import com.example.data.api.CommissionTotals
import com.example.data.api.DashboardResumo
import com.example.data.api.NewRequestPayload
import com.example.data.api.PunchClockRequest
import com.example.data.api.SessionManager
import com.example.data.api.TimeClockStatusResponse
import com.example.data.service.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val authService = AuthService()
    private val profileService = ProfileService()
    private val dashboardService = DashboardService()
    private val orderService = EmployeeOrderService()
    private val commissionService = CommissionService()
    private val timeClockService = TimeClockService()
    private val scheduleService = ScheduleService()
    private val requestService = RequestService()
    private val announcementService = AnnouncementService()
    private val performanceService = PerformanceService()
    private val documentService = DocumentService()

    private val _token = MutableStateFlow<String?>(null)
    val token: StateFlow<String?> = _token

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser

    private val _employeeProfile = MutableStateFlow<EmployeeProfile?>(null)
    val employeeProfile: StateFlow<EmployeeProfile?> = _employeeProfile

    private val _dashboardResumo = MutableStateFlow<DashboardResumo?>(null)
    val dashboardResumo: StateFlow<DashboardResumo?> = _dashboardResumo

    private val _commissionRules = MutableStateFlow<List<CommissionRuleDto>>(emptyList())
    val commissionRules: StateFlow<List<CommissionRuleDto>> = _commissionRules

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline

    private val _apiError = MutableStateFlow<String?>(null)
    val apiError: StateFlow<String?> = _apiError

    private val _myOrders = MutableStateFlow<List<EmployeeOrder>>(emptyList())
    val myOrders: StateFlow<List<EmployeeOrder>> = _myOrders

    private val _currentOrder = MutableStateFlow<OrderDetails?>(null)
    val currentOrder: StateFlow<OrderDetails?> = _currentOrder

    private val _commissions = MutableStateFlow<List<Commission>>(emptyList())
    val commissions: StateFlow<List<Commission>> = _commissions

    private val _commissionTotals = MutableStateFlow<CommissionTotals?>(null)
    val commissionTotals: StateFlow<CommissionTotals?> = _commissionTotals

    private val _currentCommission = MutableStateFlow<Commission?>(null)
    val currentCommission: StateFlow<Commission?> = _currentCommission

    private val _timeClocks = MutableStateFlow<List<TimeClockRecord>>(emptyList())
    val timeClocks: StateFlow<List<TimeClockRecord>> = _timeClocks

    private val _clockStatus = MutableStateFlow<TimeClockStatusResponse?>(null)
    val clockStatus: StateFlow<TimeClockStatusResponse?> = _clockStatus

    private val _weeklySchedule = MutableStateFlow<List<ScheduleItem>>(emptyList())
    val weeklySchedule: StateFlow<List<ScheduleItem>> = _weeklySchedule

    private val _requests = MutableStateFlow<List<EmployeeRequest>>(emptyList())
    val requests: StateFlow<List<EmployeeRequest>> = _requests

    private val _announcements = MutableStateFlow<List<Announcement>>(emptyList())
    val announcements: StateFlow<List<Announcement>> = _announcements

    private val _performance = MutableStateFlow<PerformanceMetrics?>(null)
    val performance: StateFlow<PerformanceMetrics?> = _performance

    private val _documents = MutableStateFlow<List<EmployeeDocument>>(emptyList())
    val documents: StateFlow<List<EmployeeDocument>> = _documents

    private val _activeTab = MutableStateFlow("Início")
    val activeTab: StateFlow<String> = _activeTab

    init {
        if (SessionManager.isLoggedIn) {
            _token.value = SessionManager.token
            _currentUser.value = SessionManager.currentUser
            viewModelScope.launch {
                restoreSession()
            }
        }
    }

    fun selectTab(tab: String) {
        _activeTab.value = tab
    }

    private suspend fun restoreSession() {
        _loading.value = true
        _apiError.value = null
        try {
            val user = authService.getMe()
            _currentUser.value = user
            _token.value = SessionManager.token
            syncData()
        } catch (e: UnauthorizedException) {
            authService.logoutLocal()
            _token.value = null
            _currentUser.value = null
        } catch (e: Exception) {
            _apiError.value = e.message ?: "Não foi possível restaurar a sessão."
        } finally {
            _loading.value = false
        }
    }

    fun login(loginVal: String, passwordVal: String) {
        viewModelScope.launch {
            _loading.value = true
            _apiError.value = null
            _isOffline.value = false
            try {
                if (loginVal.isBlank() || passwordVal.isBlank()) {
                    _apiError.value = "Preencha o login e senha."
                    return@launch
                }
                val authResult = authService.login(loginVal, passwordVal)
                _token.value = authResult.token
                _currentUser.value = authResult.user
                try {
                    val branding = authService.getBranding()
                    if (branding != null) {
                        Branding.companyName = branding.tradeName ?: branding.name ?: Branding.companyName
                        branding.primaryColor?.let { Branding.primaryColor = it }
                        branding.accentColor?.let { Branding.accentColor = it }
                    }
                } catch (_: Exception) { }
                syncData()
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Não foi possível conectar ao servidor."
            } finally {
                _loading.value = false
            }
        }
    }

    fun logout() {
        authService.logoutLocal()
        _token.value = null
        _currentUser.value = null
        _employeeProfile.value = null
        _dashboardResumo.value = null
        _commissionRules.value = emptyList()
        _activeTab.value = "Início"
        _isOffline.value = false
        _apiError.value = null
        _myOrders.value = emptyList()
        _commissions.value = emptyList()
        _commissionTotals.value = null
        _timeClocks.value = emptyList()
        _clockStatus.value = null
        _weeklySchedule.value = emptyList()
        _requests.value = emptyList()
        _announcements.value = emptyList()
        _performance.value = null
        _documents.value = emptyList()
    }

    fun clearError() {
        _apiError.value = null
    }

    fun retryConnection() {
        viewModelScope.launch {
            _loading.value = true
            _isOffline.value = false
            try {
                syncData()
            } catch (e: Exception) {
                if (e is OfflineException) _isOffline.value = true
                else _apiError.value = e.message
            } finally {
                _loading.value = false
            }
        }
    }

    fun refreshProfile() {
        viewModelScope.launch {
            try {
                loadProfileInternal()
            } catch (e: Exception) {
                _apiError.value = e.message
            }
        }
    }

    fun uploadProfilePhoto(bytes: ByteArray, mimeType: String) {
        viewModelScope.launch {
            _loading.value = true
            try {
                val url = profileService.uploadPhoto(bytes, mimeType)
                _employeeProfile.value = _employeeProfile.value?.copy(photoUrl = url)
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Erro ao enviar foto."
            } finally {
                _loading.value = false
            }
        }
    }

    fun loadPerformance() {
        viewModelScope.launch {
            _loading.value = true
            try {
                _performance.value = performanceService.getPerformance(null)
            } catch (e: Exception) {
                _apiError.value = e.message
            } finally {
                _loading.value = false
            }
        }
    }

    fun loadDocuments() {
        viewModelScope.launch {
            _loading.value = true
            try {
                _documents.value = documentService.getDocuments()
            } catch (e: Exception) {
                _apiError.value = e.message
            } finally {
                _loading.value = false
            }
        }
    }

    private suspend fun loadProfileInternal() {
        val me = profileService.getMe()
        _employeeProfile.value = EmployeeProfile(
            id = me.id,
            nome = me.nome,
            cargo = me.cargo,
            cpf = me.cpf,
            rg = me.rg,
            address = me.address,
            phone = me.phone,
            email = me.email,
            birthDate = me.birthDate,
            hireDate = me.hireDate,
            photoUrl = me.photoUrl,
        )
        _commissionRules.value = me.regras_comissao ?: emptyList()
    }

    private suspend fun syncData() {
        if (_token.value.isNullOrBlank()) return
        _isOffline.value = false

        try {
            loadProfileInternal()
        } catch (e: Exception) {
            if (e is OfflineException) _isOffline.value = true
        }

        try {
            dashboardService.getDashboard()?.let { dashboard ->
                _dashboardResumo.value = dashboard.resumo
                dashboard.regras_comissao?.let { _commissionRules.value = it }
                _announcements.value = (dashboard.avisos ?: emptyList()).map {
                    Announcement(it.id, it.titulo, "Comunicado interno.", "", it.lido)
                }
            }
        } catch (_: Exception) { }

        try {
            val status = timeClockService.getTodayTimeClock()
            _timeClocks.value = status.registros
            _clockStatus.value = status
        } catch (e: Exception) {
            if (e is OfflineException) _isOffline.value = true
        }

        try {
            val (start, end) = currentWeekRange()
            _weeklySchedule.value = scheduleService.getSchedule(start, end)
        } catch (e: Exception) {
            if (e is OfflineException) _isOffline.value = true
        }

        try {
            _requests.value = requestService.getRequests(null)
        } catch (e: Exception) {
            if (e is OfflineException) _isOffline.value = true
        }

        try {
            orderService.getMyOrders(null, null, null, 1, 20)?.let { response ->
                _myOrders.value = response.data
            }
        } catch (_: Exception) { }

        try {
            commissionService.getCommissions(null, null, 1, 50)?.let { response ->
                _commissions.value = response.data
                _commissionTotals.value = response.resumo
            }
        } catch (_: Exception) { }
    }

    fun punchClock(tipoAction: String, obs: String? = null) {
        viewModelScope.launch {
            _loading.value = true
            _apiError.value = null
            try {
                val statusResponse = timeClockService.punchClock(
                    PunchClockRequest(entryType = tipoAction, notes = obs),
                )
                _timeClocks.value = statusResponse.registros
                _clockStatus.value = statusResponse
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Erro ao registrar ponto."
            } finally {
                _loading.value = false
            }
        }
    }

    fun submitRequest(tipo: String, dataRef: String, descricao: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _loading.value = true
            _apiError.value = null
            try {
                val result = requestService.createRequest(NewRequestPayload(tipo, dataRef, descricao))
                _requests.value = listOf(result) + _requests.value
                onSuccess()
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Erro ao enviar solicitação."
            } finally {
                _loading.value = false
            }
        }
    }

    fun cancelRequest(requestId: String) {
        viewModelScope.launch {
            _loading.value = true
            _apiError.value = null
            try {
                requestService.cancelRequest(requestId)
                _requests.value = _requests.value.map {
                    if (it.id == requestId) it.copy(status = "cancelada") else it
                }
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Erro ao cancelar solicitação."
            } finally {
                _loading.value = false
            }
        }
    }

    fun markAnnouncementLido(id: String) {
        viewModelScope.launch {
            try {
                announcementService.markAsRead(id)
            } catch (_: Exception) { }
            _announcements.value = _announcements.value.map {
                if (it.id == id) it.copy(lido = true) else it
            }
        }
    }

    fun loadOrderDetails(orderId: String) {
        viewModelScope.launch {
            _loading.value = true
            _apiError.value = null
            try {
                val details = orderService.getMyOrderDetails(orderId)
                if (details != null) _currentOrder.value = details
                else _apiError.value = "Ordem de serviço não encontrada."
            } catch (e: Exception) {
                _apiError.value = e.message ?: "Erro ao carregar OS."
            } finally {
                _loading.value = false
            }
        }
    }

    fun loadCommissionDetails(comId: String) {
        viewModelScope.launch {
            _loading.value = true
            try {
                val fromApi = commissionService.getCommissionDetails(comId)
                _currentCommission.value = fromApi ?: _commissions.value.firstOrNull { it.id == comId }
            } finally {
                _loading.value = false
            }
        }
    }

    private fun currentWeekRange(): Pair<String, String> {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val cal = Calendar.getInstance()
        cal.firstDayOfWeek = Calendar.MONDAY
        cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        val start = fmt.format(cal.time)
        cal.add(Calendar.DAY_OF_YEAR, 6)
        val end = fmt.format(cal.time)
        return start to end
    }
}

data class EmployeeProfile(
    val id: String,
    val nome: String,
    val cargo: String,
    val cpf: String? = null,
    val rg: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val birthDate: String? = null,
    val hireDate: String? = null,
    val photoUrl: String? = null,
)
