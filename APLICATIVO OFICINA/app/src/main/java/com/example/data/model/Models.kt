package com.example.data.model

// Authentication and Staff Models
data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String, // e.g. "mecânico", "recepção", "gerente", "administrador"
    val permissions: List<String>,
    val workshop: String
)

data class Employee(
    val id: String,
    val name: String,
    val role: String
)

// Order of Service (OS) Models
data class Order(
    val id: String, // OS Number, e.g. "1024"
    val clientName: String,
    val clientPhone: String,
    val vehicleName: String,
    val vehiclePlate: String,
    val vehicleKm: Long,
    val status: OrderStatus,
    val responsibleEmployee: String,
    val entryDate: String,
    val openTime: String, // Time elapsed (e.g., "Há 2 dias", "Há 4 horas")
    val clientComplaint: String, // Queixa do cliente
    val technicalDiagnostic: String = "", // Diagnóstico técnico
    val history: List<TimelineEvent> = emptyList()
)

enum class OrderStatus(val code: String, val label: String) {
    ABERTA("aberta", "Aberta"),
    AGUARDANDO_CHECKLIST("aguardando_checklist", "Aguardando Checklist"),
    CHECKLIST_PENDENTE("checklist_pendente", "Checklist Pendente"),
    CHECKLIST_CONCLUIDO("checklist_concluido", "Checklist Concluído"),
    EM_ANALISE("em_analise", "Em Análise"),
    AGUARDANDO_ORCAMENTO("aguardando_orcamento", "Aguardando Orçamento"),
    ORCAMENTO_ENVIADO("orcamento_enviado", "Orçamento Enviado"),
    AGUARDANDO_APROVACAO("aguardando_aprovacao", "Aguardando Aprovação"),
    APROVADA("aprovada", "Aprovada"),
    EM_EXECUCAO("em_execucao", "Em Execução"),
    AGUARDANDO_PECA("aguardando_peca", "Aguardando Peça"),
    FINALIZADA("finalizada", "Finalizada"),
    PRONTA_PARA_RETIRADA("pronta_para_retirada", "Pronta para Retirada"),
    ENTREGUE("entregue", "Entregue"),
    CANCELADA("cancelada", "Cancelada");

    companion object {
        fun fromCode(code: String): OrderStatus = values().find { it.code == code } ?: ABERTA
    }
}

data class TimelineEvent(
    val id: String,
    val date: String,
    val employeeName: String,
    val statusBefore: String,
    val statusAfter: String,
    val description: String
)

// Checklist Models
data class ChecklistPhoto(
    val id: String,
    val orderId: String,
    val label: String, // e.g. "Frente", "Lateral direita", "Traseira", etc.
    val isRequired: Boolean = true,
    var photoUri: String? = null, // Local URI or empty if not taken yet
    var status: PhotoChecklistStatus = PhotoChecklistStatus.PENDING,
    var observation: String = "",
    var isUploaded: Boolean = false
)

enum class PhotoChecklistStatus(val code: String, val label: String) {
    PENDING("pending", "Não tirada"),
    OK("ok", "OK"),
    ATTENTION("attention", "Atenção"),
    DAMAGED("damaged", "Danificado"),
    NONE("not_applicable", "Não se aplica")
}

// Budget Models
data class BudgetItem(
    val id: String,
    val type: BudgetItemType, // PEÇA ou SERVIÇO
    val code: String,
    val name: String,
    val qty: Int,
    val unitPrice: Double,
    val discount: Double = 0.0,
    val executorId: String? = null, // Mandatory for services
    val executorName: String? = null,
    val observation: String = ""
) {
    val total: Double
        get() = (qty * unitPrice) - discount
}

enum class BudgetItemType {
    PART, SERVICE
}

data class Budget(
    val orderId: String,
    val items: List<BudgetItem> = emptyList(),
    val totalParts: Double = 0.0,
    val totalServices: Double = 0.0,
    val discount: Double = 0.0,
    val grandTotal: Double = 0.0,
    val isDraft: Boolean = true
)

// Supported support models
data class Product(
    val id: String,
    val code: String,
    val name: String,
    val price: Double,
    val stockQty: Int
)

data class ServiceCatalog(
    val id: String,
    val code: String,
    val name: String,
    val price: Double
)
