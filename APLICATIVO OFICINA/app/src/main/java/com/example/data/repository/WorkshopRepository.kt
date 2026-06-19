package com.example.data.repository

import com.example.data.model.*
import com.example.data.service.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

object WorkshopRepository {
    private val authService = AuthService()
    private val dashboardService = DashboardService()
    private val orderService = OrderService()
    private val checklistService = ChecklistService()
    private val photoService = PhotoService()
    private val budgetService = BudgetService()
    private val employeeService = EmployeeService()
    private val productService = ProductService()
    private val serviceCatalogService = ServiceCatalogService()
    private val notificationService = NotificationService()

    // Persistent/State Cache for high-fidelity live interaction in the applet
    private val _isOfflineMode = MutableStateFlow(false)
    val isOfflineMode: StateFlow<Boolean> = _isOfflineMode

    private val _lastApiError = MutableStateFlow<String?>(null)
    val lastApiError: StateFlow<String?> = _lastApiError

    // Preloaded robust datasets representing the actual "Beto Mecânica" workshop state
    private val orders = mutableListOf(
        Order(
            id = "1024",
            clientName = "Marcelo Alencar",
            clientPhone = "11988887766",
            vehicleName = "Porsche 911 Carrera S (Preto)",
            vehiclePlate = "PST-9111",
            vehicleKm = 12450,
            status = OrderStatus.AGUARDANDO_CHECKLIST,
            responsibleEmployee = "Beto Souza",
            entryDate = "18/06/2026 10:15",
            openTime = "Há 4 horas",
            clientComplaint = "Estalo metálico na suspensão traseira ao fazer curvas fechadas; revisão geral dos 12.000 KM.",
            technicalDiagnostic = "Requer análise detalhada com veículo suspenso na rampa. Coxins traseiros apresentam folga moderada.",
            history = listOf(
                TimelineEvent("e1", "18/06/2026 10:15", "Recepcionista Ana", "Aberta", "Aguardando Checklist", "Ordem aberta para triagem e checklist de entrada.")
            )
        ),
        Order(
            id = "1023",
            clientName = "Juliana Mendes",
            clientPhone = "11977775544",
            vehicleName = "Honda CB 650R Neo Sports",
            vehiclePlate = "HON-650R",
            vehicleKm = 3400,
            status = OrderStatus.EM_EXECUCAO,
            responsibleEmployee = "Mecânico Carlos",
            entryDate = "17/06/2026 14:30",
            openTime = "Há 1 dia",
            clientComplaint = "Vibração no guidão em velocidades acima de 80 km/h; pastilhas de freio dianteiro barulhentas.",
            technicalDiagnostic = "Desbalanceamento do pneu dianteiro detectado. Necessário substituir pastilha sinterizada direita.",
            history = listOf(
                TimelineEvent("e2", "17/06/2026 14:35", "Mecânico Carlos", "Aberta", "Aguardando Checklist", "Cadastrada no console."),
                TimelineEvent("e3", "17/06/2026 15:10", "Mecânico Carlos", "Aguardando Checklist", "Em Análise", "Checklist fotográfico concluído."),
                TimelineEvent("e4", "17/06/2026 16:20", "Supervisor Beto", "Em Análise", "Em Execução", "Orçamento aprovado pelo cliente via WhatsApp.")
            )
        ),
        Order(
            id = "1022",
            clientName = "Geraldo Santos",
            clientPhone = "11966663322",
            vehicleName = "Mercedes AMG GT R (Vermelha)",
            vehiclePlate = "AMG-0001",
            vehicleKm = 8200,
            status = OrderStatus.FINALIZADA,
            responsibleEmployee = "Beto Souza",
            entryDate = "16/06/2026 09:00",
            openTime = "Há 2 dias",
            clientComplaint = "Instabilidade do painel digital auxiliar; barulho aerodinâmico na porta esquerda em alta velocidade.",
            technicalDiagnostic = "Atualização de firmware realizada no módulo eletrônico central. Vedação da porta reajustada.",
            history = listOf(
                TimelineEvent("e5", "16/06/2026 09:10", "Recepcionista Ana", "Aberta", "Aguardando Checklist", "Recebimento na rampa 1."),
                TimelineEvent("e6", "17/06/2026 11:00", "Mecânico Carlos", "Aguardando Checklist", "Em Execução", "Vistoria e reparos executados."),
                TimelineEvent("e7", "18/06/2026 11:30", "Supervisor Beto", "Em Execução", "Finalizada", "Reparo homologado e veículo limpo.")
            )
        )
    )

    private val checklists = mutableMapOf<String, List<ChecklistPhoto>>()
    private val budgets = mutableMapOf<String, Budget>()

    // Standard items for motorcycle checklist, as requested by prompt
    private val motoChecklistTemplate = listOf(
        "Frente",
        "Lateral direita",
        "Lateral esquerda",
        "Traseira",
        "Painel / KM",
        "Placa",
        "Pneu dianteiro",
        "Pneu traseiro",
        "Freio dianteiro",
        "Freio traseiro",
        "Avarias",
        "Itens / acessórios deixados"
    )

    val employees = listOf(
        Employee("emp_01", "Beto Souza", "Chefe de Oficina / Gerente"),
        Employee("emp_02", "Mecânico Carlos", "Mecânico Máster"),
        Employee("emp_03", "Mecânico André", "Especialista Elétrica"),
        Employee("emp_04", "Recepcionista Ana", "Atendimento / Recepcionista")
    )

    val products = listOf(
        Product("p_01", "PA-110", "Pastilha Freio Dianteira Sinterizada", 280.00, 15),
        Product("p_02", "OL-5W40", "Óleo Sintético 5W40 Premium - 1L", 75.00, 80),
        Product("p_03", "FL-AR", "Filtro de Ar Esportivo K&N", 420.00, 4),
        Product("p_04", "AM-TRS", "Amortecedor Traseiro Regulável COFFAP", 980.00, 2)
    )

    val serviceCatalog = listOf(
        ServiceCatalog("s_01", "MAO-REV", "Revisão Geral Preventiva Automotiva", 450.00),
        ServiceCatalog("s_02", "MAO-SUS", "Alinhamento, Balanceamento e Check Diagnóstico de Suspensão", 180.00),
        ServiceCatalog("s_03", "MAO-ELE", "Diagnóstico e Reparo Elétrico / Atualização de Módulo", 250.00),
        ServiceCatalog("s_04", "MAO-FRO", "Troca de Pastilhas e Fluido de Freio", 120.00)
    )

    init {
        // Pre-populate checklists for our active Orders
        orders.forEach { order ->
            checklists[order.id] = motoChecklistTemplate.mapIndexed { index, label ->
                ChecklistPhoto(
                    id = "photo_${order.id}_$index",
                    orderId = order.id,
                    label = label,
                    isRequired = true,
                    status = if (order.status == OrderStatus.FINALIZADA) PhotoChecklistStatus.OK else PhotoChecklistStatus.PENDING
                )
            }
        }
    }

    fun clearLastError() {
        _lastApiError.value = null
    }

    fun toggleOfflineMode() {
        _isOfflineMode.value = !_isOfflineMode.value
    }

    // Wrap real services with custom exception handling to guide UX fallbacks beautifully
    suspend fun getMetrics(): Map<String, Int> {
        return try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode Enabled")
            dashboardService.getMetrics()
        } catch (e: Exception) {
            _lastApiError.value = e.message ?: "Conexão interrompida"
            // Fallback: local active metrics
            val open = orders.filter { it.status == OrderStatus.AGUARDANDO_CHECKLIST }.size
            val analysis = orders.filter { it.status == OrderStatus.EM_ANALISE }.size
            val finalizadas = orders.filter { it.status == OrderStatus.FINALIZADA }.size
            mapOf(
                "os_aguardando_checklist" to open,
                "em_analise" to analysis,
                "aguardando_aprovacao" to 1,
                "finalizadas_hoje" to finalizadas
            )
        }
    }

    suspend fun getOrders(query: String = "", statusFilter: String = "Todas"): List<Order> {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode Enabled")
            val apiResult = orderService.getOrders(query, statusFilter)
            if (apiResult.isNotEmpty()) return apiResult
        } catch (e: Exception) {
            _lastApiError.value = e.message ?: "Conexão interrompida"
        }
        
        // Return local list filtered
        return orders.filter { order ->
            val matchesQuery = query.isEmpty() || 
                order.clientName.contains(query, ignoreCase = true) ||
                order.vehicleName.contains(query, ignoreCase = true) ||
                order.vehiclePlate.contains(query, ignoreCase = true) ||
                order.id.contains(query)
            
            val matchesStatus = statusFilter == "Todas" || 
                (statusFilter == "Checklist" && order.status == OrderStatus.AGUARDANDO_CHECKLIST) ||
                (statusFilter == "Em análise" && order.status == OrderStatus.EM_ANALISE) ||
                (statusFilter == "Em execução" && order.status == OrderStatus.EM_EXECUCAO) ||
                (statusFilter == "Finalizadas" && order.status == OrderStatus.FINALIZADA) ||
                order.status.label.equals(statusFilter, ignoreCase = true)
                
            matchesQuery && matchesStatus
        }
    }

    suspend fun getOrderById(id: String): Order {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode Enabled")
            return orderService.getOrderById(id)
        } catch (e: Exception) {
            _lastApiError.value = e.message ?: "Conexão interrompida"
        }
        return orders.find { it.id == id } ?: throw IllegalStateException("Ordem de Serviço $id não encontrada.")
    }

    suspend fun updateOrderStatus(id: String, status: OrderStatus, technicalNotes: String = "", notifyClient: Boolean = false): Boolean {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            orderService.updateOrderStatus(id, status.code, technicalNotes, notifyClient)
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }

        // Apply change to local memory database
        val index = orders.indexOfFirst { it.id == id }
        if (index != -1) {
            val oldOrder = orders[index]
            val updatedHistory = oldOrder.history.toMutableList()
            updatedHistory.add(
                TimelineEvent(
                    id = "e_${System.currentTimeMillis()}",
                    date = "Hoje",
                    employeeName = SessionManager.currentUser?.name ?: "Beto Souza",
                    statusBefore = oldOrder.status.label,
                    statusAfter = status.label,
                    description = technicalNotes.ifEmpty { "Transição de status executada na oficina." }
                )
            )

            orders[index] = oldOrder.copy(
                status = status,
                technicalDiagnostic = if (technicalNotes.isNotEmpty()) technicalNotes else oldOrder.technicalDiagnostic,
                history = updatedHistory
            )
            return true
        }
        return false
    }

    suspend fun getChecklistPhotos(orderId: String): List<ChecklistPhoto> {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            val apiList = checklistService.getChecklistPhotos(orderId)
            if (apiList.isNotEmpty()) return apiList
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }
        return checklists[orderId] ?: emptyList()
    }

    suspend fun updateChecklistItem(orderId: String, photoId: String, status: PhotoChecklistStatus, observation: String, photoUri: String? = null): Boolean {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            photoService.updatePhotoStatus(photoId, status, observation)
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }

        // Apply locally
        val list = checklists[orderId]?.toMutableList() ?: return false
        val idx = list.indexOfFirst { it.id == photoId }
        if (idx != -1) {
            val item = list[idx]
            list[idx] = item.copy(
                status = status,
                observation = observation,
                photoUri = photoUri ?: item.photoUri,
                isUploaded = photoUri != null
            )
            checklists[orderId] = list
            return true
        }
        return false
    }

    suspend fun completeChecklist(orderId: String): Boolean {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            checklistService.completeChecklist(orderId)
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }

        // Perform transition to checklist completed, then to em_analise
        updateOrderStatus(orderId, OrderStatus.EM_ANALISE, "Checklist fotográfico concluído.", false)
        return true
    }

    suspend fun getBudget(orderId: String): Budget {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            return budgetService.getBudget(orderId)
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }
        return budgets[orderId] ?: Budget(orderId)
    }

    suspend fun saveBudget(orderId: String, budget: Budget): Boolean {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            budgetService.saveBudget(orderId, budget)
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }
        budgets[orderId] = budget
        // Transition OS status to budget ready
        updateOrderStatus(orderId, OrderStatus.AGUARDANDO_APROVACAO, "Orçamento elaborado e aguardando aprovação.", false)
        return true
    }

    suspend fun sendBudgetToClient(orderId: String): Boolean {
        try {
            if (_isOfflineMode.value) throw IllegalStateException("Offline Mode")
            budgetService.sendBudgetToClient(orderId)
            val order = getOrderById(orderId)
            notificationService.notifyClientOnWhatsApp(order.clientPhone, "*Beto Mecânica*\nSeu orçamento da OS #${order.id} está pronto e disponível para aprovação!")
        } catch (e: Exception) {
            _lastApiError.value = e.message
        }
        updateOrderStatus(orderId, OrderStatus.ORCAMENTO_ENVIADO, "Orçamento enviado para aprovação do cliente pelo WhatsApp.", false)
        return true
    }
}
