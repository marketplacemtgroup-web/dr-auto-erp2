package com.example.data.mapper

import com.example.data.api.*
import com.example.data.model.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

object ApiMappers {
    private val isoParser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale("pt", "BR"))
    private val displayFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("pt", "BR"))

    fun toUser(session: AuthSessionDto): User = User(
        id = session.user.id,
        name = session.user.name,
        email = session.user.email,
        role = session.role,
        permissions = session.permissions,
        workshop = session.organizationName,
    )

    fun toOrder(row: ServiceOrderRowDto): Order {
        val vehicleLabel = listOfNotNull(
            row.vehicle.brand,
            row.vehicle.model,
            row.vehicle.color?.let { "($it)" },
        ).joinToString(" ").ifBlank { "Veículo" }

        return Order(
            id = row.id,
            number = row.number,
            clientName = row.vehicle.customer.name,
            clientPhone = row.vehicle.customer.whatsapp ?: row.vehicle.customer.phone ?: "",
            vehicleName = vehicleLabel,
            vehiclePlate = row.vehicle.plate,
            vehicleKm = 0,
            status = OrderStatus.fromApi(row.status),
            responsibleEmployee = "—",
            entryDate = formatDate(row.updatedAt),
            openTime = relativeTime(row.updatedAt),
            clientComplaint = "",
            vehicleId = row.vehicle.id,
        )
    }

    fun toOrderDetail(dto: ServiceOrderDetailDto): Order {
        val base = toOrder(
            ServiceOrderRowDto(
                id = dto.id,
                number = dto.number,
                status = dto.status,
                updatedAt = dto.updatedAt ?: dto.createdAt ?: "",
                vehicle = dto.vehicle,
            ),
        )
        return base.copy(
            vehicleKm = dto.entryKm?.toLong() ?: 0,
            clientComplaint = dto.complaint.orEmpty(),
            technicalDiagnostic = dto.diagnosis.orEmpty(),
            responsibleEmployee = dto.generalResponsible?.name ?: "—",
            entryDate = formatDate(dto.enteredAt ?: dto.createdAt ?: dto.updatedAt),
            openTime = relativeTime(dto.updatedAt ?: dto.createdAt),
            history = dto.statusHistory.orEmpty().map { toTimeline(it) },
            vehicleId = dto.vehicle.id,
        )
    }

    fun toTimeline(row: StatusHistoryDto): TimelineEvent = TimelineEvent(
        id = row.id,
        date = formatDate(row.createdAt),
        employeeName = row.user?.name ?: "Sistema",
        statusBefore = row.fromStatus?.let { OrderStatus.fromApi(it).label } ?: "—",
        statusAfter = OrderStatus.fromApi(row.toStatus).label,
        description = row.reason ?: row.notes ?: "Atualização de status",
    )

    fun toChecklistPhotos(
        orderId: String,
        items: List<ChecklistItemDto>,
        attachments: List<AttachmentDto>,
    ): List<ChecklistPhoto> {
        val byCategory = attachments.groupBy { it.category }
        return items.map { item ->
            val slug = checklistCategorySlug(item.label)
            val photo = byCategory[slug]?.firstOrNull()
                ?: attachments.firstOrNull { it.category.contains(item.label, ignoreCase = true) }
            ChecklistPhoto(
                id = item.id,
                orderId = orderId,
                label = item.label,
                category = item.category,
                photoUri = photo?.url,
                attachmentId = photo?.id,
                status = PhotoChecklistStatus.fromApi(item.result),
                observation = item.notes.orEmpty(),
                isUploaded = photo != null,
            )
        }
    }

    fun checklistCategorySlug(label: String): String =
        "checklist-${label.lowercase(Locale.ROOT).replace(Regex("[^a-z0-9]+"), "-").trim('-')}"

    fun toBudget(dto: ServiceOrderDetailDto): Budget {
        val quote = pickActiveQuote(dto.quotes.orEmpty())
        val items = if (quote?.lines != null && quote.lines.isNotEmpty()) {
            quote.lines.map { toBudgetItem(it) }
        } else {
            dto.items.orEmpty().map { toBudgetItemFromSoItem(it) }
        }
        val parts = items.filter { it.type == BudgetItemType.PART }.sumOf { it.total }
        val services = items.filter { it.type == BudgetItemType.SERVICE }.sumOf { it.total }
        return Budget(
            orderId = dto.id,
            quoteId = quote?.id,
            items = items,
            totalParts = parts,
            totalServices = services,
            grandTotal = parts + services,
            isDraft = quote?.status == "DRAFT",
            quoteStatus = quote?.status,
        )
    }

    private fun pickActiveQuote(quotes: List<QuoteMiniDto>): QuoteMiniDto? =
        quotes.firstOrNull { it.status == "PENDING" }
            ?: quotes.firstOrNull { it.status == "DRAFT" }
            ?: quotes.firstOrNull { it.status == "APPROVED" }
            ?: quotes.firstOrNull()

    fun toBudgetItem(line: QuoteLineDto): BudgetItem = BudgetItem(
        id = line.id,
        type = if (line.lineType == "PART") BudgetItemType.PART else BudgetItemType.SERVICE,
        code = line.id.take(8),
        name = line.description,
        qty = line.quantity,
        unitPrice = toDouble(line.unitPrice),
        discount = toDouble(line.discount),
        serviceOrderItemId = line.serviceOrderItemId,
    )

    fun toBudgetItemFromSoItem(item: ServiceOrderItemDto): BudgetItem = BudgetItem(
        id = item.id,
        type = if (item.itemType == "PART") BudgetItemType.PART else BudgetItemType.SERVICE,
        code = item.product?.id ?: item.catalogItem?.id ?: item.id.take(8),
        name = item.description,
        qty = item.quantity,
        unitPrice = toDouble(item.unitPrice),
        discount = toDouble(item.discount),
        executorId = item.executor?.id,
        executorName = item.executor?.name,
        serviceOrderItemId = item.id,
    )

    fun toEmployee(row: EmployeeRowDto): Employee = Employee(
        id = row.id,
        name = row.name,
        role = row.jobTitle?.name ?: row.accessProfile ?: "Técnico",
    )

    fun toProduct(row: ProductRowDto): Product = Product(
        id = row.id,
        code = row.sku ?: row.id.take(8),
        name = row.name,
        price = toDouble(row.salePrice),
        stockQty = row.stock,
    )

    fun toServiceCatalog(row: ServiceCatalogRowDto): ServiceCatalog = ServiceCatalog(
        id = row.id,
        code = row.id.take(8),
        name = row.name,
        price = toDouble(row.defaultPrice),
    )

    fun dashboardMetrics(kpis: DashboardKpisDto, orders: List<Order>): Map<String, Int> {
        val received = orders.count { it.status == OrderStatus.RECEIVED }
        val diagnosis = orders.count { it.status == OrderStatus.DIAGNOSIS }
        val awaitingApproval = orders.count { it.status == OrderStatus.AWAITING_APPROVAL }
        return mapOf(
            "os_aguardando_checklist" to received,
            "em_analise" to diagnosis,
            "aguardando_aprovacao" to maxOf(kpis.pendingQuotes, awaitingApproval),
            "finalizadas_hoje" to orders.count { it.status == OrderStatus.FINISHED },
            "open_service_orders" to kpis.openServiceOrders,
            "vehicles_in_shop" to kpis.vehiclesInShop,
        )
    }

    fun filterStatusParam(filter: String): String? = when (filter) {
        "Todas" -> null
        "Checklist", "Recebido" -> OrderStatus.RECEIVED.apiCode
        "Em análise", "Em diagnóstico" -> OrderStatus.DIAGNOSIS.apiCode
        "Aguardando aprovação" -> OrderStatus.AWAITING_APPROVAL.apiCode
        "Em execução" -> OrderStatus.IN_PROGRESS.apiCode
        "Finalizadas" -> OrderStatus.FINISHED.apiCode
        else -> OrderStatus.entries.find { it.label.equals(filter, ignoreCase = true) }?.apiCode
    }

    fun toDouble(value: Any?): Double = when (value) {
        null -> 0.0
        is Number -> value.toDouble()
        is String -> value.toDoubleOrNull() ?: 0.0
        else -> 0.0
    }

    private fun formatDate(raw: String?): String {
        if (raw.isNullOrBlank()) return "—"
        return try {
            val date = isoParser.parse(raw.take(19))
            if (date != null) displayFormat.format(date) else raw
        } catch (_: Exception) {
            raw
        }
    }

    private fun relativeTime(raw: String?): String {
        if (raw.isNullOrBlank()) return "—"
        return try {
            val date = isoParser.parse(raw.take(19)) ?: return raw
            val diff = System.currentTimeMillis() - date.time
            val hours = TimeUnit.MILLISECONDS.toHours(diff)
            when {
                hours < 1 -> "Há poucos minutos"
                hours < 24 -> "Há ${hours}h"
                else -> "Há ${(hours / 24.0).roundToInt()} dias"
            }
        } catch (_: Exception) {
            raw
        }
    }
}
