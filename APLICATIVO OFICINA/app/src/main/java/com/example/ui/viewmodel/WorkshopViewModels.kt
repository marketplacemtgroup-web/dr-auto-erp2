package com.example.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.*
import com.example.data.repository.WorkshopRepository
import com.example.data.service.AuthService
import com.example.data.service.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

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

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadOrder(orderId: String) {
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
        technicalNotes: String,
        notifyClient: Boolean,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val success = repository.updateOrderStatus(orderId, newStatus, technicalNotes, notifyClient)
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

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    private val _isUploading = MutableStateFlow(false)
    val isUploading: StateFlow<Boolean> = _isUploading.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadChecklist(orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val order = repository.getOrderById(orderId)
                _orderNumber.value = order.displayNumber
                _photosList.value = repository.getChecklistPhotos(orderId)
            } catch (e: Exception) {
                _error.value = e.message ?: "Falha ao carregar checklist"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updatePhotoItem(
        orderId: String,
        photoId: String,
        status: PhotoChecklistStatus,
        observation: String,
        photoUri: String? = null,
    ) {
        viewModelScope.launch {
            try {
                val success = repository.updateChecklistItem(orderId, photoId, status, observation, photoUri)
                if (success) loadChecklist(orderId)
            } catch (e: Exception) {
                _actionError.value = e.message
            }
        }
    }

    fun uploadPhotoAndUpdate(
        context: Context,
        orderId: String,
        item: ChecklistPhoto,
        localUri: Uri,
        status: PhotoChecklistStatus,
        observation: String,
        onDone: () -> Unit,
    ) {
        viewModelScope.launch {
            _isUploading.value = true
            _actionError.value = null
            try {
                repository.uploadChecklistPhoto(context, orderId, item.id, item.label, localUri)
                repository.updateChecklistItem(orderId, item.id, status, observation)
                loadChecklist(orderId)
                onDone()
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha no upload da foto"
            } finally {
                _isUploading.value = false
            }
        }
    }

    fun completeChecklist(orderId: String, onDone: () -> Unit) {
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

    fun clearLastError() {
        repository.clearLastError()
    }
}

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

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadBudget(orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                val catalogErrors = repository.ensureCatalogs()
                val order = repository.getOrderById(orderId)
                _orderNumber.value = order.displayNumber
                _budget.value = repository.getBudget(orderId)
                _productSearchResults.value = repository.products
                if (catalogErrors.isNotEmpty()) {
                    _actionError.value = catalogErrors.joinToString("\n")
                }
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun searchProducts(query: String) {
        viewModelScope.launch {
            _isSearchingProducts.value = true
            try {
                _productSearchResults.value = repository.searchProducts(query)
            } catch (e: Exception) {
                _actionError.value = e.message ?: "Falha ao buscar peças"
            } finally {
                _isSearchingProducts.value = false
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
        _actionError.value = "Peça adicionada: ${product.name}"
    }

    fun refreshCatalogs() {
        viewModelScope.launch {
            try {
                val catalogErrors = repository.ensureCatalogs(force = true)
                _productSearchResults.value = repository.products
                if (catalogErrors.isNotEmpty()) {
                    _actionError.value = catalogErrors.joinToString("\n")
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
