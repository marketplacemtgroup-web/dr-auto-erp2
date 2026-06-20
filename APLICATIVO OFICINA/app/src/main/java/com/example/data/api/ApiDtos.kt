package com.example.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class AuthSessionDto(
    val accessToken: String,
    val user: UserDto,
    val organizationId: String,
    val organizationName: String,
    val branchId: String?,
    val role: String,
    val permissions: List<String>,
)

@JsonClass(generateAdapter = true)
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
)

@JsonClass(generateAdapter = true)
data class ApiErrorBody(val message: String? = null)

@JsonClass(generateAdapter = true)
data class DashboardKpisDto(
    val openServiceOrders: Int = 0,
    val vehiclesInShop: Int = 0,
    val pendingQuotes: Int = 0,
    val delayedServices: Int = 0,
    val waitingClients: Int = 0,
    val lowStockParts: Int = 0,
)

@JsonClass(generateAdapter = true)
data class CustomerMiniDto(
    val id: String? = null,
    val name: String,
    val phone: String? = null,
    val whatsapp: String? = null,
)

@JsonClass(generateAdapter = true)
data class VehicleMiniDto(
    val id: String? = null,
    val plate: String,
    val brand: String? = null,
    val model: String? = null,
    val year: Int? = null,
    val color: String? = null,
    val customer: CustomerMiniDto,
)

@JsonClass(generateAdapter = true)
data class EmployeeMiniDto(
    val id: String,
    val name: String,
)

@JsonClass(generateAdapter = true)
data class ServiceOrderRowDto(
    val id: String,
    val number: Int,
    val status: String,
    val totalAmount: Any? = null,
    val estimatedAt: String? = null,
    val updatedAt: String,
    val vehicle: VehicleMiniDto,
)

@JsonClass(generateAdapter = true)
data class ChecklistItemDto(
    val id: String,
    val category: String,
    val label: String,
    val result: String? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class StatusHistoryDto(
    val id: String,
    val fromStatus: String? = null,
    val toStatus: String,
    val reason: String? = null,
    val notes: String? = null,
    val createdAt: String,
    val user: EmployeeMiniDto? = null,
)

@JsonClass(generateAdapter = true)
data class AttachmentDto(
    val id: String,
    val fileName: String,
    val mimeType: String,
    val storagePath: String,
    val url: String? = null,
    val category: String = "general",
    val visibleToCustomer: Boolean = false,
    val showOnQuote: Boolean = false,
    val createdAt: String? = null,
)

@JsonClass(generateAdapter = true)
data class ServiceOrderItemDto(
    val id: String,
    val description: String,
    val itemType: String,
    val quantity: Int,
    val unitPrice: Any,
    val discount: Any? = null,
    val executor: EmployeeMiniDto? = null,
    val product: IdNameDto? = null,
    val catalogItem: IdNameDto? = null,
)

@JsonClass(generateAdapter = true)
data class IdNameDto(
    val id: String? = null,
    val name: String,
)

@JsonClass(generateAdapter = true)
data class QuoteMiniDto(
    val id: String,
    val number: Int? = null,
    val status: String,
    val amount: Any? = null,
    val createdAt: String? = null,
    val lines: List<QuoteLineDto>? = null,
)

@JsonClass(generateAdapter = true)
data class QuoteLineDto(
    val id: String,
    val description: String,
    val lineType: String,
    val quantity: Int,
    val unitPrice: Any,
    val discount: Any? = null,
    val approved: Boolean? = null,
    val serviceOrderItemId: String? = null,
)

@JsonClass(generateAdapter = true)
data class ServiceOrderDetailDto(
    val id: String,
    val number: Int,
    val status: String,
    val complaint: String? = null,
    val diagnosis: String? = null,
    val internalNotes: String? = null,
    val customerVisibleNotes: String? = null,
    val entryKm: Int? = null,
    val enteredAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val vehicle: VehicleMiniDto,
    val generalResponsible: EmployeeMiniDto? = null,
    val items: List<ServiceOrderItemDto>? = null,
    val quotes: List<QuoteMiniDto>? = null,
    val checklistItems: List<ChecklistItemDto>? = null,
    val statusHistory: List<StatusHistoryDto>? = null,
    val attachments: List<AttachmentDto>? = null,
)

@JsonClass(generateAdapter = true)
data class UpdateServiceOrderRequest(
    val status: String? = null,
    val diagnosis: String? = null,
    val internalNotes: String? = null,
    val customerVisibleNotes: String? = null,
    val statusReason: String? = null,
)

@JsonClass(generateAdapter = true)
data class ChecklistItemUpdateDto(
    val id: String,
    val result: String? = null,
    val notes: String? = null,
)

@JsonClass(generateAdapter = true)
data class UpdateChecklistRequest(val items: List<ChecklistItemUpdateDto>)

@JsonClass(generateAdapter = true)
data class CreateServiceOrderItemRequest(
    val description: String,
    val itemType: String? = null,
    val quantity: Int? = null,
    val unitPrice: Double,
    val productId: String? = null,
    val catalogItemId: String? = null,
    val discount: Double? = null,
    val executorId: String? = null,
)

@JsonClass(generateAdapter = true)
data class CreateQuoteRequest(
    val serviceOrderId: String? = null,
    val vehicleId: String? = null,
    val complaint: String? = null,
    val amount: Double? = null,
    val status: String? = null,
)

@JsonClass(generateAdapter = true)
data class UpdateQuoteRequest(
    val status: String? = null,
    val amount: Double? = null,
)

@JsonClass(generateAdapter = true)
data class QuoteDetailDto(
    val id: String,
    val number: Int? = null,
    val status: String,
    val amount: Any? = null,
    val serviceOrderId: String? = null,
    val lines: List<QuoteLineDto>? = null,
)

@JsonClass(generateAdapter = true)
data class ShareLinkResponseDto(
    val token: String,
    val expiresAt: String,
    val path: String,
    val whatsappMessage: String? = null,
)

@JsonClass(generateAdapter = true)
data class PortalLinkResponseDto(
    val token: String,
    val expiresAt: String,
    val path: String,
    val whatsappMessage: String? = null,
)

@JsonClass(generateAdapter = true)
data class PrepareUploadRequest(
    val fileName: String,
    val mimeType: String,
    val category: String? = null,
    val visibleToCustomer: Boolean? = null,
    val showOnQuote: Boolean? = null,
)

@JsonClass(generateAdapter = true)
data class PrepareUploadResponseDto(
    val uploadUrl: String,
    val storagePath: String,
    val bucket: String? = null,
    val token: String? = null,
    val method: String? = null,
    val headers: Map<String, String>? = null,
)

@JsonClass(generateAdapter = true)
data class ConfirmUploadRequest(
    val storagePath: String,
    val fileName: String,
    val mimeType: String,
    val category: String? = null,
    val visibleToCustomer: Boolean? = null,
    val showOnQuote: Boolean? = null,
)

@JsonClass(generateAdapter = true)
data class EmployeeRowDto(
    val id: String,
    val name: String,
    val jobTitle: IdNameDto? = null,
    val accessProfile: String? = null,
)

@JsonClass(generateAdapter = true)
data class ProductRowDto(
    val id: String,
    val name: String,
    val sku: String? = null,
    val stock: Int = 0,
    val salePrice: Any,
)

@JsonClass(generateAdapter = true)
data class ServiceCatalogRowDto(
    val id: String,
    val name: String,
    val defaultPrice: Any,
)
