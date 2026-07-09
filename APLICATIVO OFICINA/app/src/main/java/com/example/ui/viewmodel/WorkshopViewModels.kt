package com.example.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.*
import com.example.data.repository.WorkshopRepository
import com.example.data.service.AuthService
import com.example.data.service.SessionManager
import com.example.util.ChecklistLocalStore
import com.example.util.ChecklistTemplate
import com.example.util.LocalChecklistDraft
import com.example.util.LocalWorkPhoto
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class AuthViewModel : ViewModel() {
    private val authService = AuthService()

    private val _loginState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    private val _sessionChecked = MutableStateFlow(false)
    val sessionChecked: StateFlow<Boolean> = _sessionChecked.asStateFlow()

    init {
        viewModelScope.launch {
            if (SessionManager.isLoggedIn) {
                runCatching { authService.restoreSession() }
            }
            _sessionChecked.value = true
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _loginState.value = LoginUiState.Error("Preencha todos os campos.")
            return
        }
        _loginState.value = LoginUiState.Loading
        viewModelScope.launch {
            try {
                val user = authService.login(email, password)
                _loginState.value = LoginUiState.Success(user)
            } catch (e: Exception) {
                _loginState.value = LoginUiState.Error(e.message ?: "Falha na autenticação")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authService.logout()
            _loginState.value = LoginUiState.Idle
        }
    }

    fun clearError() {
        if (_loginState.value is LoginUiState.Error) {
            _loginState.value = LoginUiState.Idle
        }
    }
}

sealed interface LoginUiState {
    object Idle : LoginUiState
    object Loading : LoginUiState
    data class Success(val user: User) : LoginUiState
    data class Error(val message: String) : LoginUiState
}

class DashboardViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _metrics = MutableStateFlow<Map<String, Int>>(emptyMap())
    val metrics: StateFlow<Map<String, Int>> = _metrics.asStateFlow()

    private val _priorityOrders = MutableStateFlow<List<Order>>(emptyList())
    val priorityOrders: StateFlow<List<Order>> = _priorityOrders.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    init {
        loadDashboardContent()
    }

    fun loadDashboardContent() {
        _isRefreshing.value = true
        viewModelScope.launch {
            try {
                _metrics.value = repository.getMetrics()
                val allOrders = repository.getOrders()
                _priorityOrders.value = allOrders.filter {
                    it.status == OrderStatus.RECEIVED ||
                        it.status == OrderStatus.IN_PROGRESS ||
                        it.status == OrderStatus.DIAGNOSIS ||
                        it.status == OrderStatus.AWAITING_APPROVAL
                }
            } catch (_: Exception) {
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun clearLastError() {
        repository.clearLastError()
    }

    fun toggleOffline() {
        repository.toggleOfflineMode()
        loadDashboardContent()
    }
}

class OrdersViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _currentFilter = MutableStateFlow("Todas")
    val currentFilter: StateFlow<String> = _currentFilter.asStateFlow()

    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadOrders() {
        if (!SessionManager.isLoggedIn) return
        _isLoading.value = true
        _actionError.value = null
        viewModelScope.launch {
            try {
                _orders.value = repository.getOrders(_searchQuery.value, _currentFilter.value)
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao carregar ordens de serviço"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateSearch(query: String) {
        _searchQuery.value = query
        loadOrders()
    }

    fun updateFilter(filter: String) {
        _currentFilter.value = filter
        loadOrders()
    }

    fun resetToAll() {
        _currentFilter.value = "Todas"
        _searchQuery.value = ""
        loadOrders()
    }

    fun clearActionError() {
        _actionError.value = null
    }

    fun clearLastError() {
        repository.clearLastError()
    }
}

class OrderDetailsViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _order = MutableStateFlow<Order?>(null)
    val order: StateFlow<Order?> = _order.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _isSavingNotes = MutableStateFlow(false)
    val isSavingNotes: StateFlow<Boolean> = _isSavingNotes.asStateFlow()

    private val _notesMessage = MutableStateFlow<String?>(null)
    val notesMessage: StateFlow<String?> = _notesMessage.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadOrder(context: android.content.Context, orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val loaded = repository.getOrderById(orderId)
                if (ChecklistLocalStore.isOrderClosed(loaded.status)) {
                    ChecklistLocalStore.clearOrder(context, orderId)
                }
                _order.value = loaded
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao carregar OS"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadOrder(orderId: String) {
        // Mantido para compatibilidade — sem limpeza local
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                _order.value = repository.getOrderById(orderId)
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao carregar OS"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun transitionStatus(
        orderId: String,
        newStatus: OrderStatus,
        diagnosis: String,
        customerVisibleNotes: String,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val success = repository.updateOrderStatus(
                    orderId,
                    newStatus,
                    diagnosis,
                    customerVisibleNotes,
                )
                if (success) {
                    loadOrder(orderId)
                    onDone()
                } else {
                    _error.value = "Não foi possível atualizar a OS."
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Erro na transição"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun saveOrderNotes(
        orderId: String,
        complaint: String,
        diagnosis: String,
        customerVisibleNotes: String,
        onDone: () -> Unit = {},
    ) {
        viewModelScope.launch {
            _isSavingNotes.value = true
            _notesMessage.value = null
            _error.value = null
            try {
                val success = repository.updateOrderNotes(
                    id = orderId,
                    complaint = complaint,
                    diagnosis = diagnosis,
                    customerVisibleNotes = customerVisibleNotes,
                )
                if (success) {
                    loadOrder(orderId)
                    _notesMessage.value = "Observações salvas."
                    onDone()
                } else {
                    _error.value = "Não foi possível salvar as observações."
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Erro ao salvar observações"
            } finally {
                _isSavingNotes.value = false
            }
        }
    }

    fun clearNotesMessage() {
        _notesMessage.value = null
    }

    fun clearLastError() {
        repository.clearLastError()
    }
}

class ChecklistViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _photosList = MutableStateFlow<List<ChecklistPhoto>>(emptyList())
    val photosList: StateFlow<List<ChecklistPhoto>> = _photosList.asStateFlow()

    private val _orderNumber = MutableStateFlow("")
    val orderNumber: StateFlow<String> = _orderNumber.asStateFlow()

    private val _orderStatus = MutableStateFlow<OrderStatus?>(null)
    val orderStatus: StateFlow<OrderStatus?> = _orderStatus.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _hasUnsavedChanges = MutableStateFlow(false)
    val hasUnsavedChanges: StateFlow<Boolean> = _hasUnsavedChanges.asStateFlow()

    private val _saveMessage = MutableStateFlow<String?>(null)
    val saveMessage: StateFlow<String?> = _saveMessage.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    private var currentOrderId: String = ""
    private var localDrafts: MutableMap<String, LocalChecklistDraft> = mutableMapOf()

    fun loadChecklist(context: Context, orderId: String) {
        currentOrderId = orderId
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val order = repository.getOrderById(orderId)
                _orderNumber.value = order.displayNumber
                _orderStatus.value = order.status

                if (ChecklistLocalStore.isOrderClosed(order.status)) {
                    ChecklistLocalStore.clearOrder(context, orderId)
                    localDrafts.clear()
                    _hasUnsavedChanges.value = false
                } else {
                    localDrafts = ChecklistLocalStore.loadDrafts(context, orderId).toMutableMap()
                    _hasUnsavedChanges.value = localDrafts.values.any { it.isDirty }
                }

                val serverList = repository.getChecklistPhotos(orderId)
                _photosList.value = mergeWithDrafts(serverList)
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao carregar checklist"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun mergeWithDrafts(serverList: List<ChecklistPhoto>): List<ChecklistPhoto> =
        serverList.map { item ->
            val draft = localDrafts[item.id]
            if (draft == null) return@map item
            item.copy(
                status = draft.status ?: item.status,
                observation = if (draft.isDirty) draft.observation else item.observation,
                photoUri = ChecklistLocalStore.displayUri(draft.localPhotoPath, item.photoUri),
                isUploaded = item.isUploaded && draft.localPhotoPath.isNullOrBlank(),
            )
        }

    fun updateDraftStatus(context: Context, itemId: String, status: PhotoChecklistStatus) {
        val current = localDrafts[itemId] ?: LocalChecklistDraft()
        localDrafts[itemId] = current.copy(status = status, isDirty = true)
        _photosList.value = _photosList.value.map { item ->
            if (item.id == itemId) item.copy(status = status) else item
        }
        ChecklistLocalStore.saveDrafts(context, currentOrderId, localDrafts)
        _hasUnsavedChanges.value = true
    }

    fun updateDraftObservation(context: Context, itemId: String, observation: String) {
        val current = localDrafts[itemId] ?: LocalChecklistDraft()
        localDrafts[itemId] = current.copy(observation = observation, isDirty = true)
        _photosList.value = _photosList.value.map { item ->
            if (item.id == itemId) item.copy(observation = observation) else item
        }
        ChecklistLocalStore.saveDrafts(context, currentOrderId, localDrafts)
        _hasUnsavedChanges.value = true
    }

    fun setLocalPhoto(context: Context, itemId: String, sourceUri: Uri) {
        val path = ChecklistLocalStore.saveLocalPhoto(context, currentOrderId, itemId, sourceUri)
            ?: run {
                _actionError.value = "Não foi possível salvar a foto localmente"
                return
            }
        val current = localDrafts[itemId] ?: LocalChecklistDraft()
        localDrafts[itemId] = current.copy(localPhotoPath = path, isDirty = true)
        val displayUri = ChecklistLocalStore.displayUri(path, null)
        _photosList.value = _photosList.value.map { item ->
            if (item.id == itemId) item.copy(photoUri = displayUri, isUploaded = false) else item
        }
        ChecklistLocalStore.saveDrafts(context, currentOrderId, localDrafts)
        _hasUnsavedChanges.value = true
    }

    fun saveChecklist(context: Context, orderId: String, onDone: () -> Unit = {}) {
        if (_isSaving.value) return
        _isSaving.value = true
        _actionError.value = null
        viewModelScope.launch {
            try {
                val items = _photosList.value
                for (item in items) {
                    val draft = localDrafts[item.id]
                    val localPath = draft?.localPhotoPath
                    if (draft?.isDirty == true && !localPath.isNullOrBlank() && File(localPath).exists()) {
                        repository.uploadChecklistPhotoFile(orderId, item.label, File(localPath))
                    }
                }

                val updates = items.associate { item ->
                    val draft = localDrafts[item.id]
                    item.id to (
                        (draft?.status ?: item.status) to
                            (if (draft?.isDirty == true) draft.observation else item.observation)
                        )
                }
                repository.batchUpdateChecklist(orderId, updates)

                localDrafts.keys.toList().forEach { itemId ->
                    val draft = localDrafts[itemId] ?: return@forEach
                    localDrafts[itemId] = draft.copy(isDirty = false)
                }
                ChecklistLocalStore.saveDrafts(context, orderId, localDrafts)
                _hasUnsavedChanges.value = false

                val serverList = repository.getChecklistPhotos(orderId)
                _photosList.value = mergeWithDrafts(serverList)
                _saveMessage.value = "Checklist salvo com sucesso."
                onDone()
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao salvar checklist"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun completeChecklist(context: Context, orderId: String, onDone: () -> Unit) {
        if (_hasUnsavedChanges.value) {
            saveChecklist(context, orderId) {
                finalizeChecklist(orderId, onDone)
            }
        } else {
            finalizeChecklist(orderId, onDone)
        }
    }

    private fun finalizeChecklist(orderId: String, onDone: () -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                val success = repository.completeChecklist(orderId)
                if (success) onDone() else _error.value = "Falha ao finalizar o checklist."
            } catch (e: Exception) {
                _error.value = e.message ?: "Erro ao salvar"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearActionError() {
        _actionError.value = null
    }

    fun clearSaveMessage() {
        _saveMessage.value = null
    }

    fun clearLastError() {
        repository.clearLastError()
    }
}

class WorkPhotosViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _photos = MutableStateFlow<List<WorkPhotoItem>>(emptyList())
    val photos: StateFlow<List<WorkPhotoItem>> = _photos.asStateFlow()

    private val _orderNumber = MutableStateFlow("")
    val orderNumber: StateFlow<String> = _orderNumber.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _saveMessage = MutableStateFlow<String?>(null)
    val saveMessage: StateFlow<String?> = _saveMessage.asStateFlow()

    val pendingCount: Int
        get() = _photos.value.count { !it.isUploaded }

    private var currentOrderId: String = ""
    private var localPhotos: MutableList<LocalWorkPhoto> = mutableListOf()

    fun load(context: Context, orderId: String) {
        currentOrderId = orderId
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val order = repository.getOrderById(orderId)
                _orderNumber.value = order.displayNumber

                if (ChecklistLocalStore.isOrderClosed(order.status)) {
                    ChecklistLocalStore.clearPendingWorkPhotos(context, orderId)
                    localPhotos.clear()
                } else {
                    localPhotos = ChecklistLocalStore.loadWorkPhotos(context, orderId).toMutableList()
                }

                val remote = repository.listWorkPhotoAttachments(orderId).map { attachment ->
                    WorkPhotoItem(
                        id = attachment.id,
                        displayUri = attachment.url,
                        isUploaded = true,
                        attachmentId = attachment.id,
                    )
                }

                val pending = localPhotos.filter { !it.uploaded }.map { local ->
                    WorkPhotoItem(
                        id = local.id,
                        displayUri = ChecklistLocalStore.displayUri(local.localPath, local.remoteUrl),
                        isUploaded = false,
                        localPath = local.localPath,
                    )
                }

                _photos.value = remote + pending
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao carregar fotos"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addLocalPhoto(context: Context, sourceUri: Uri) {
        val photo = ChecklistLocalStore.saveWorkPhoto(context, currentOrderId, sourceUri)
            ?: run {
                _actionError.value = "Não foi possível salvar a foto"
                return
            }
        localPhotos.add(photo)
        ChecklistLocalStore.saveWorkPhotosMeta(context, currentOrderId, localPhotos)
        _photos.value = _photos.value + WorkPhotoItem(
            id = photo.id,
            displayUri = ChecklistLocalStore.displayUri(photo.localPath, null),
            isUploaded = false,
            localPath = photo.localPath,
        )
    }

    fun savePhotos(context: Context, onDone: () -> Unit = {}) {
        if (_isSaving.value) return
        val pending = localPhotos.filter { !it.uploaded }
        if (pending.isEmpty()) {
            _saveMessage.value = "Nenhuma foto pendente para enviar."
            return
        }
        _isSaving.value = true
        _actionError.value = null
        viewModelScope.launch {
            try {
                val updated = localPhotos.toMutableList()
                for (photo in pending) {
                    val file = File(photo.localPath)
                    if (!file.exists()) continue
                    val attachment = repository.uploadWorkPhotoFile(currentOrderId, file)
                    val index = updated.indexOfFirst { it.id == photo.id }
                    if (index >= 0) {
                        updated[index] = photo.copy(
                            uploaded = true,
                            remoteUrl = attachment.url,
                            attachmentId = attachment.id,
                        )
                    }
                    file.delete()
                }
                localPhotos = updated.filter { !it.uploaded || it.localPath.isNotBlank() }.toMutableList()
                ChecklistLocalStore.saveWorkPhotosMeta(context, currentOrderId, localPhotos.filter { !it.uploaded })
                ChecklistLocalStore.clearPendingWorkPhotos(context, currentOrderId)
                localPhotos.removeAll { it.uploaded }
                load(context, currentOrderId)
                _saveMessage.value = "${pending.size} foto(s) enviada(s) com sucesso."
                onDone()
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao enviar fotos"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun clearActionError() {
        _actionError.value = null
    }

    fun clearSaveMessage() {
        _saveMessage.value = null
    }
}

data class WorkPhotoItem(
    val id: String,
    val displayUri: String?,
    val isUploaded: Boolean,
    val localPath: String? = null,
    val attachmentId: String? = null,
)

class BudgetViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _budget = MutableStateFlow<Budget?>(null)
    val budget: StateFlow<Budget?> = _budget.asStateFlow()

    private val _orderNumber = MutableStateFlow("")
    val orderNumber: StateFlow<String> = _orderNumber.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _shareMessage = MutableStateFlow<String?>(null)
    val shareMessage: StateFlow<String?> = _shareMessage.asStateFlow()

    val products: StateFlow<List<Product>> = repository.productsFlow
    val serviceCatalog: StateFlow<List<ServiceCatalog>> = repository.serviceCatalogFlow
    val employees: StateFlow<List<Employee>> = repository.employeesFlow

    private val _productSearchResults = MutableStateFlow<List<Product>>(emptyList())
    val productSearchResults: StateFlow<List<Product>> = _productSearchResults.asStateFlow()

    private val _isSearchingProducts = MutableStateFlow(false)
    val isSearchingProducts: StateFlow<Boolean> = _isSearchingProducts.asStateFlow()

    private val _serviceSearchResults = MutableStateFlow<List<ServiceCatalog>>(emptyList())
    val serviceSearchResults: StateFlow<List<ServiceCatalog>> = _serviceSearchResults.asStateFlow()

    private val _isSearchingServices = MutableStateFlow(false)
    val isSearchingServices: StateFlow<Boolean> = _isSearchingServices.asStateFlow()

    private val _isCreatingService = MutableStateFlow(false)
    val isCreatingService: StateFlow<Boolean> = _isCreatingService.asStateFlow()

    private var productSearchJob: Job? = null
    private var serviceSearchJob: Job? = null

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadBudget(orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val order = repository.getOrderById(orderId)
                _orderNumber.value = order.displayNumber
                _budget.value = repository.getBudget(orderId)
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun preparePartSheet() {
        viewModelScope.launch {
            val error = repository.ensureProducts()
            _productSearchResults.value = repository.products
            if (error != null) {
                _actionError.value = error
            }
        }
    }

    fun prepareServiceSheet() {
        viewModelScope.launch {
            val errors = repository.ensureServicesAndEmployees()
            _serviceSearchResults.value = repository.serviceCatalog
            if (errors.isNotEmpty()) {
                _actionError.value = errors.joinToString("\n")
            }
        }
    }

    fun searchProducts(query: String) {
        productSearchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.isBlank() && repository.products.isNotEmpty()) {
            _productSearchResults.value = repository.products
            _isSearchingProducts.value = false
            return
        }
        productSearchJob = viewModelScope.launch {
            _isSearchingProducts.value = true
            try {
                _productSearchResults.value = repository.searchProducts(trimmed)
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao buscar peças"
            } finally {
                _isSearchingProducts.value = false
            }
        }
    }

    fun searchServices(query: String) {
        serviceSearchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.isBlank() && repository.serviceCatalog.isNotEmpty()) {
            _serviceSearchResults.value = repository.serviceCatalog
            _isSearchingServices.value = false
            return
        }
        serviceSearchJob = viewModelScope.launch {
            _isSearchingServices.value = true
            try {
                _serviceSearchResults.value = repository.searchServices(trimmed)
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao buscar serviços"
            } finally {
                _isSearchingServices.value = false
            }
        }
    }

    fun createServiceCatalog(name: String, price: Double, onCreated: (ServiceCatalog) -> Unit) {
        if (name.isBlank()) {
            _actionError.value = "Informe o nome do serviço"
            return
        }
        if (price <= 0) {
            _actionError.value = "Informe um valor válido"
            return
        }
        _isCreatingService.value = true
        viewModelScope.launch {
            try {
                val created = repository.createServiceCatalog(name, price)
                _serviceSearchResults.value = repository.serviceCatalog
                onCreated(created)
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao cadastrar serviço"
            } finally {
                _isCreatingService.value = false
            }
        }
    }

    fun addPartToBudget(orderId: String, product: Product, qty: Int = 1) {
        addItemToBudget(
            orderId,
            BudgetItem(
                id = "item_${System.currentTimeMillis()}",
                type = BudgetItemType.PART,
                code = product.id,
                name = product.name,
                qty = qty,
                unitPrice = product.price,
            ),
        )
    }

    fun addManualServiceToBudget(
        orderId: String,
        name: String,
        unitPrice: Double,
        executor: Employee? = null,
    ) {
        addItemToBudget(
            orderId,
            BudgetItem(
                id = "item_${System.currentTimeMillis()}",
                type = BudgetItemType.SERVICE,
                code = "manual_${System.currentTimeMillis()}",
                name = name.trim(),
                qty = 1,
                unitPrice = unitPrice,
                executorId = executor?.id,
                executorName = executor?.name,
            ),
        )
    }

    fun refreshCatalogs() {
        viewModelScope.launch {
            try {
                val errors = repository.ensureCatalogs(force = true)
                _productSearchResults.value = repository.products
                _serviceSearchResults.value = repository.serviceCatalog
                if (errors.isNotEmpty()) {
                    _actionError.value = errors.joinToString("\n")
                }
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao atualizar catálogos"
            }
        }
    }

    fun addItemToBudget(orderId: String, item: BudgetItem) {
        val currentBudget = _budget.value ?: Budget(orderId = orderId)
        val updatedItems = currentBudget.items.toMutableList()
        val existingIndex = updatedItems.indexOfFirst { it.code == item.code && it.type == item.type }
        if (existingIndex != -1) {
            val existing = updatedItems[existingIndex]
            updatedItems[existingIndex] = existing.copy(qty = existing.qty + item.qty)
        } else {
            updatedItems.add(item)
        }
        recalculateBudget(orderId, updatedItems, currentBudget.quoteId)
    }

    fun removeItemFromBudget(orderId: String, itemCode: String, type: BudgetItemType) {
        val currentBudget = _budget.value ?: return
        val updatedItems = currentBudget.items.filterNot { it.code == itemCode && it.type == type }
        recalculateBudget(orderId, updatedItems, currentBudget.quoteId)
    }

    private fun recalculateBudget(orderId: String, items: List<BudgetItem>, quoteId: String?) {
        val partsTotal = items.filter { it.type == BudgetItemType.PART }.sumOf { it.total }
        val servicesTotal = items.filter { it.type == BudgetItemType.SERVICE }.sumOf { it.total }
        _budget.value = Budget(
            orderId = orderId,
            quoteId = quoteId,
            items = items,
            totalParts = partsTotal,
            totalServices = servicesTotal,
            grandTotal = partsTotal + servicesTotal,
            isDraft = true,
        )
    }

    fun saveBudgetDraft(orderId: String, onSaved: () -> Unit = {}) {
        val currentBudget = _budget.value ?: Budget(orderId = orderId)
        if (currentBudget.items.isEmpty()) {
            _actionError.value = "Adicione ao menos uma peça ou serviço antes de salvar."
            return
        }
        _isSaving.value = true
        viewModelScope.launch {
            try {
                if (repository.saveBudget(orderId, currentBudget)) {
                    _budget.value = repository.reloadBudget(orderId)
                    _actionError.value = "Orçamento salvo com sucesso."
                    onSaved()
                } else {
                    _actionError.value = "Falha ao salvar rascunho"
                }
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Erro ao salvar orçamento"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun sendBudgetToClient(orderId: String, onDone: () -> Unit) {
        val currentBudget = _budget.value ?: Budget(orderId = orderId)
        if (currentBudget.items.isEmpty()) {
            _actionError.value = "Adicione ao menos uma peça ou serviço antes de enviar."
            return
        }
        _isSaving.value = true
        viewModelScope.launch {
            try {
                repository.saveBudget(orderId, currentBudget.copy(isDraft = false))
                if (repository.sendBudgetToClient(orderId)) {
                    _shareMessage.value = WorkshopRepository.lastShareMessage
                    onDone()
                } else {
                    _actionError.value = "Falha ao notificar cliente."
                }
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Erro ao enviar"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun clearActionError() {
        _actionError.value = null
    }

    fun clearLastError() {
        repository.clearLastError()
        _error.value = null
    }
}

enum class CreateOsStep {
    SEARCH,
    NEW_CUSTOMER,
    NEW_VEHICLE,
    CONFIRM,
}

class CreateServiceOrderViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _step = MutableStateFlow(CreateOsStep.SEARCH)
    val step: StateFlow<CreateOsStep> = _step.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _vehicles = MutableStateFlow<List<VehicleListItem>>(emptyList())
    val vehicles: StateFlow<List<VehicleListItem>> = _vehicles.asStateFlow()

    private val _selectedVehicle = MutableStateFlow<VehicleListItem?>(null)
    val selectedVehicle: StateFlow<VehicleListItem?> = _selectedVehicle.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _customerName = MutableStateFlow("")
    val customerName: StateFlow<String> = _customerName.asStateFlow()

    private val _customerDocument = MutableStateFlow("")
    val customerDocument: StateFlow<String> = _customerDocument.asStateFlow()

    private val _customerPhone = MutableStateFlow("")
    val customerPhone: StateFlow<String> = _customerPhone.asStateFlow()

    private val _customerWhatsapp = MutableStateFlow("")
    val customerWhatsapp: StateFlow<String> = _customerWhatsapp.asStateFlow()

    private val _vehiclePlate = MutableStateFlow("")
    val vehiclePlate: StateFlow<String> = _vehiclePlate.asStateFlow()

    private val _vehicleBrand = MutableStateFlow("")
    val vehicleBrand: StateFlow<String> = _vehicleBrand.asStateFlow()

    private val _vehicleModel = MutableStateFlow("")
    val vehicleModel: StateFlow<String> = _vehicleModel.asStateFlow()

    private val _vehicleYear = MutableStateFlow("")
    val vehicleYear: StateFlow<String> = _vehicleYear.asStateFlow()

    private val _vehicleColor = MutableStateFlow("")
    val vehicleColor: StateFlow<String> = _vehicleColor.asStateFlow()

    private val _complaint = MutableStateFlow("")
    val complaint: StateFlow<String> = _complaint.asStateFlow()

    private var searchJob: Job? = null
    private var createdCustomerId: String? = null

    init {
        refreshVehicleSearch()
    }

    fun updateSearch(query: String) {
        _searchQuery.value = query
        refreshVehicleSearch()
    }

    private fun refreshVehicleSearch() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _isSearching.value = true
            _error.value = null
            try {
                _vehicles.value = repository.searchVehicles(_searchQuery.value)
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao buscar veículos"
            } finally {
                _isSearching.value = false
            }
        }
    }

    fun selectVehicle(vehicle: VehicleListItem) {
        _selectedVehicle.value = vehicle
        _step.value = CreateOsStep.CONFIRM
        _error.value = null
    }

    fun startNewCustomerFlow() {
        _step.value = CreateOsStep.NEW_CUSTOMER
        _error.value = null
    }

    fun goBackToSearch() {
        _step.value = CreateOsStep.SEARCH
        _selectedVehicle.value = null
        createdCustomerId = null
        _error.value = null
    }

    fun goBackFromVehicleStep() {
        _step.value = CreateOsStep.NEW_CUSTOMER
        _error.value = null
    }

    fun goBackFromConfirm() {
        _step.value = if (createdCustomerId != null) {
            CreateOsStep.NEW_VEHICLE
        } else {
            CreateOsStep.SEARCH
        }
        _error.value = null
    }

    fun updateCustomerName(value: String) { _customerName.value = value }
    fun updateCustomerDocument(value: String) { _customerDocument.value = value }
    fun updateCustomerPhone(value: String) { _customerPhone.value = value }
    fun updateCustomerWhatsapp(value: String) { _customerWhatsapp.value = value }

    fun updateVehiclePlate(value: String) { _vehiclePlate.value = value.uppercase() }
    fun updateVehicleBrand(value: String) { _vehicleBrand.value = value }
    fun updateVehicleModel(value: String) { _vehicleModel.value = value }
    fun updateVehicleYear(value: String) { _vehicleYear.value = value.filter { it.isDigit() }.take(4) }
    fun updateVehicleColor(value: String) { _vehicleColor.value = value }
    fun updateComplaint(value: String) { _complaint.value = value }

    fun saveCustomer(onSuccess: () -> Unit = {}) {
        if (_customerName.value.isBlank()) {
            _error.value = "Informe o nome do cliente."
            return
        }
        viewModelScope.launch {
            _isSubmitting.value = true
            _error.value = null
            try {
                createdCustomerId = repository.createCustomer(
                    name = _customerName.value,
                    document = _customerDocument.value,
                    phone = _customerPhone.value,
                    whatsapp = _customerWhatsapp.value,
                )
                _step.value = CreateOsStep.NEW_VEHICLE
                onSuccess()
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao cadastrar cliente"
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    fun saveVehicle(onSuccess: () -> Unit = {}) {
        val customerId = createdCustomerId
        if (customerId.isNullOrBlank()) {
            _error.value = "Cliente não encontrado. Volte e cadastre novamente."
            return
        }
        if (_vehiclePlate.value.isBlank()) {
            _error.value = "Informe a placa do veículo."
            return
        }
        viewModelScope.launch {
            _isSubmitting.value = true
            _error.value = null
            try {
                val year = _vehicleYear.value.toIntOrNull()
                val vehicle = repository.createVehicle(
                    customerId = customerId,
                    plate = _vehiclePlate.value,
                    brand = _vehicleBrand.value,
                    model = _vehicleModel.value,
                    year = year,
                    color = _vehicleColor.value,
                )
                _selectedVehicle.value = vehicle
                _step.value = CreateOsStep.CONFIRM
                onSuccess()
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao cadastrar veículo"
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    fun createOrder(onSuccess: (String) -> Unit) {
        val vehicleId = _selectedVehicle.value?.id
        if (vehicleId.isNullOrBlank()) {
            _error.value = "Selecione um veículo."
            return
        }
        viewModelScope.launch {
            _isSubmitting.value = true
            _error.value = null
            try {
                val order = repository.createServiceOrder(vehicleId, _complaint.value)
                onSuccess(order.id)
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao criar ordem de serviço"
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
