package com.example.data.model

data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val permissions: List<String>,
    val workshop: String,
)

data class Employee(
    val id: String,
    val name: String,
    val role: String,
)

data class Order(
    val id: String,
    val number: Int,
    val clientName: String,
    val clientPhone: String,
    val vehicleName: String,
    val vehiclePlate: String,
    val vehicleKm: Long,
    val status: OrderStatus,
    val responsibleEmployee: String,
    val entryDate: String,
    val openTime: String,
    val clientComplaint: String,
    val technicalDiagnostic: String = "",
    val customerVisibleNotes: String = "",
    val history: List<TimelineEvent> = emptyList(),
    val vehicleId: String? = null,
    /** ISO timestamp bruto da API para filtros de data. */
    val updatedAtIso: String? = null,
    val estimatedAtIso: String? = null,
) {
    val displayNumber: String get() = number.toString()

    companion object {
        val OPEN_STATUSES = setOf(
            OrderStatus.RECEIVED,
            OrderStatus.DIAGNOSIS,
            OrderStatus.AWAITING_QUOTE,
            OrderStatus.AWAITING_APPROVAL,
            OrderStatus.APPROVED,
            OrderStatus.IN_PROGRESS,
            OrderStatus.AWAITING_PART,
        )
    }
}

/** Status alinhados ao Prisma / API NestJS. */
enum class OrderStatus(val apiCode: String, val label: String) {
    RECEIVED("RECEIVED", "Recebido"),
    DIAGNOSIS("DIAGNOSIS", "Em diagnóstico"),
    AWAITING_QUOTE("AWAITING_QUOTE", "Aguardando orçamento"),
    AWAITING_APPROVAL("AWAITING_APPROVAL", "Aguardando aprovação"),
    APPROVED("APPROVED", "Aprovado"),
    IN_PROGRESS("IN_PROGRESS", "Em execução"),
    AWAITING_PART("AWAITING_PART", "Aguardando peça"),
    PAUSED("PAUSED", "Pausado"),
    AWAITING_PAYMENT("AWAITING_PAYMENT", "Aguardando pagamento"),
    FINISHED("FINISHED", "Finalizado"),
    DELIVERED("DELIVERED", "Entregue"),
    CANCELLED("CANCELLED", "Cancelado");

    companion object {
        fun fromApi(code: String): OrderStatus =
            entries.find { it.apiCode == code } ?: RECEIVED
    }
}

data class TimelineEvent(
    val id: String,
    val date: String,
    val employeeName: String,
    val statusBefore: String,
    val statusAfter: String,
    val description: String,
)

data class ChecklistPhoto(
    val id: String,
    val orderId: String,
    val label: String,
    val category: String = "",
    val isRequired: Boolean = true,
    var photoUri: String? = null,
    var attachmentId: String? = null,
    var status: PhotoChecklistStatus = PhotoChecklistStatus.PENDING,
    var observation: String = "",
    var isUploaded: Boolean = false,
)

enum class PhotoChecklistStatus(val apiCode: String?, val label: String) {
    PENDING(null, "Não avaliado"),
    OK("OK", "OK"),
    ATTENTION("ATTENTION", "Atenção"),
    DAMAGED("DAMAGED", "Danificado"),
    NONE("NA", "Não se aplica");

    companion object {
        fun fromApi(code: String?): PhotoChecklistStatus = when (code) {
            "OK" -> OK
            "ATTENTION" -> ATTENTION
            "DAMAGED" -> DAMAGED
            "NA" -> NONE
            else -> PENDING
        }
    }
}

data class BudgetItem(
    val id: String,
    val type: BudgetItemType,
    val code: String,
    val name: String,
    val qty: Int,
    val unitPrice: Double,
    val discount: Double = 0.0,
    val executorId: String? = null,
    val executorName: String? = null,
    val observation: String = "",
    val serviceOrderItemId: String? = null,
) {
    val total: Double
        get() = (qty * unitPrice) - discount
}

enum class BudgetItemType {
    PART, SERVICE;

    val apiType: String
        get() = if (this == PART) "PART" else "SERVICE"
}

data class Budget(
    val orderId: String,
    val quoteId: String? = null,
    val items: List<BudgetItem> = emptyList(),
    val totalParts: Double = 0.0,
    val totalServices: Double = 0.0,
    val discount: Double = 0.0,
    val grandTotal: Double = 0.0,
    val isDraft: Boolean = true,
    val quoteStatus: String? = null,
)

data class Product(
    val id: String,
    val code: String,
    val name: String,
    val price: Double,
    val stockQty: Int,
    val availableQty: Int = stockQty,
)

data class ServiceCatalog(
    val id: String,
    val code: String,
    val name: String,
    val price: Double,
)

data class VehicleListItem(
    val id: String,
    val plate: String,
    val brand: String?,
    val model: String?,
    val year: Int?,
    val color: String?,
    val customerId: String,
    val customerName: String,
) {
    val displayLabel: String
        get() {
            val modelLabel = listOfNotNull(brand, model).joinToString(" ")
            return "$customerName — $plate${if (modelLabel.isNotBlank()) " ($modelLabel)" else ""}"
        }
}
