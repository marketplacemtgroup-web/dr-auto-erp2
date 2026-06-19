package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.*
import com.example.data.repository.WorkshopRepository
import com.example.data.service.AuthService
import com.example.data.service.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

// 1. Auth View Model
class AuthViewModel : ViewModel() {
    private val authService = AuthService()

    private val _loginState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

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

// 2. Dashboard View Model
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
                // Fetch priority/active orders (Aguardando checklist or Em execução)
                val allOrders = repository.getOrders()
                _priorityOrders.value = allOrders.filter { 
                    it.status == OrderStatus.AGUARDANDO_CHECKLIST || 
                    it.status == OrderStatus.EM_EXECUCAO || 
                    it.status == OrderStatus.EM_ANALISE
                }
            } catch (e: Exception) {
                // Caught inside repository or handled here
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

// 3. Orders View Model
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

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    init {
        loadOrders()
    }

    fun loadOrders() {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                _orders.value = repository.getOrders(_searchQuery.value, _currentFilter.value)
            } catch (e: Exception) {
                // Handled in repository
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

    fun clearLastError() {
        repository.clearLastError()
    }
}

// 4. Order Details View Model
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

    fun transitionStatus(orderId: String, newStatus: OrderStatus, technicalNotes: String, notifyClient: Boolean, onDone: () -> Unit) {
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

// 5. Checklist View Model
class ChecklistViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _photosList = MutableStateFlow<List<ChecklistPhoto>>(emptyList())
    val photosList: StateFlow<List<ChecklistPhoto>> = _photosList.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadChecklist(orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
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
        photoUri: String? = null
    ) {
        viewModelScope.launch {
            try {
                val success = repository.updateChecklistItem(orderId, photoId, status, observation, photoUri)
                if (success) {
                    loadChecklist(orderId)
                }
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }

    fun completeChecklist(orderId: String, onDone: () -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                val success = repository.completeChecklist(orderId)
                if (success) {
                    onDone()
                } else {
                    _error.value = "Falha ao finalizar o checklist."
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Erro ao salvar"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearLastError() {
        repository.clearLastError()
    }
}

// 6. Budget View Model
class BudgetViewModel : ViewModel() {
    private val repository = WorkshopRepository

    private val _budget = MutableStateFlow<Budget?>(null)
    val budget: StateFlow<Budget?> = _budget.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    // Catalogs auto-fetched
    val products = repository.products
    val serviceCatalog = repository.serviceCatalog
    val employees = repository.employees

    val isOfflineMode = repository.isOfflineMode
    val lastApiError = repository.lastApiError

    fun loadBudget(orderId: String) {
        _isLoading.value = true
        _error.value = null
        viewModelScope.launch {
            try {
                _budget.value = repository.getBudget(orderId)
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addItemToBudget(orderId: String, item: BudgetItem) {
        val currentBudget = _budget.value ?: Budget(orderId = orderId)
        val updatedItems = currentBudget.items.toMutableList()
        
        // Check if item of same code already exists, increment qty
        val existingIndex = updatedItems.indexOfFirst { it.code == item.code && it.type == item.type }
        if (existingIndex != -1) {
            val existing = updatedItems[existingIndex]
            updatedItems[existingIndex] = existing.copy(qty = existing.qty + item.qty)
        } else {
            updatedItems.add(item)
        }

        recalculateBudget(orderId, updatedItems)
    }

    fun removeItemFromBudget(orderId: String, itemCode: String, type: BudgetItemType) {
        val currentBudget = _budget.value ?: return
        val updatedItems = currentBudget.items.filterNot { it.code == itemCode && it.type == type }
        recalculateBudget(orderId, updatedItems)
    }

    private fun recalculateBudget(orderId: String, items: List<BudgetItem>) {
        val partsTotal = items.filter { it.type == BudgetItemType.PART }.sumOf { it.total }
        val servicesTotal = items.filter { it.type == BudgetItemType.SERVICE }.sumOf { it.total }
        val grandTotal = partsTotal + servicesTotal
        
        _budget.value = Budget(
            orderId = orderId,
            items = items,
            totalParts = partsTotal,
            totalServices = servicesTotal,
            grandTotal = grandTotal,
            isDraft = true
        )
    }

    fun saveBudgetDraft(orderId: String, onDone: () -> Unit) {
        val currentBudget = _budget.value ?: return
        _isLoading.value = true
        viewModelScope.launch {
            try {
                val success = repository.saveBudget(orderId, currentBudget)
                if (success) {
                    onDone()
                } else {
                    _error.value = "Falha ao salvar rascunho"
                }
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun sendBudgetToClient(orderId: String, onDone: () -> Unit) {
        val currentBudget = _budget.value ?: return
        _isLoading.value = true
        viewModelScope.launch {
            try {
                // Save first
                repository.saveBudget(orderId, currentBudget.copy(isDraft = false))
                // Send next
                val success = repository.sendBudgetToClient(orderId)
                if (success) {
                    onDone()
                } else {
                    _error.value = "Falha ao notificar cliente via WhatsApp."
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Erro ao enviar"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearLastError() {
        repository.clearLastError()
        _error.value = null
    }
}
