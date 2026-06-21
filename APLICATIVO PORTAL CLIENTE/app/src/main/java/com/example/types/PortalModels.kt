package com.example.types

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Organization(
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val portalWelcome: String? = null,
    val address: String? = null,
    val logoUrl: String? = null,
    val primaryColor: String? = null,
    val accentColor: String? = null
)

@JsonClass(generateAdapter = true)
data class Customer(
    val name: String,
    val phone: String? = null,
    val whatsapp: String? = null,
    val document: String? = null
)

@JsonClass(generateAdapter = true)
data class Vehicle(
    val id: String,
    val plate: String,
    val brand: String,
    val model: String,
    val year: String? = null,
    val color: String? = null,
    val currentKm: Int? = null,
    val vehicleKind: String? = null
)

@JsonClass(generateAdapter = true)
data class ServiceOrderItem(
    val id: String,
    val description: String,
    val itemType: String, // 'SERVICE' or 'PART'
    val quantity: Double,
    val unitPrice: Double,
    val discount: Double? = 0.0,
    val approved: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class ServiceOrderStatusHistory(
    val fromStatus: String? = null,
    val toStatus: String,
    val toLabel: String,
    val notes: String? = null,
    val userName: String? = null,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class ChecklistItem(
    val category: String,
    val label: String,
    val result: String, // 'OK', 'ATTENTION', 'DAMAGED', 'NA'
    val notes: String? = null,
    val photoUrl: String? = null
)

@JsonClass(generateAdapter = true)
data class ServiceOrderAttachment(
    val id: String,
    val fileName: String,
    val mimeType: String,
    val url: String,
    val category: String? = null,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class ServiceOrder(
    val id: String,
    val number: Int,
    val status: String,
    val statusLabel: String,
    val totalAmount: Double? = 0.0,
    val complaint: String? = null,
    val customerVisibleNotes: String? = null,
    val estimatedAt: String? = null,
    val entryKm: Int? = null,
    val createdAt: String,
    val updatedAt: String,
    val items: List<ServiceOrderItem>? = null,
    val timeline: List<ServiceOrderStatusHistory>? = null,
    val checklistItems: List<ChecklistItem>? = null,
    val photos: List<String>? = null
)

@JsonClass(generateAdapter = true)
data class ServiceOrderSummary(
    val id: String,
    val number: Int,
    val status: String
)

@JsonClass(generateAdapter = true)
data class PortalQuoteLine(
    val id: String,
    val description: String,
    val lineType: String, // 'SERVICE' or 'PART'
    val quantity: Double,
    val unitPrice: Double,
    val discount: Double? = 0.0,
    val approved: Boolean? = null,
    val sortOrder: Int? = 0
)

@JsonClass(generateAdapter = true)
data class PortalQuoteRow(
    val id: String,
    val number: Int,
    val status: String, // 'PENDING', 'APPROVED', 'REJECTED'
    val amount: Double,
    val canRespond: Boolean,
    val isSupplement: Boolean,
    val pendingLineCount: Int,
    val lines: List<PortalQuoteLine> = emptyList(),
    val photos: List<String>? = null,
    val serviceOrder: ServiceOrderSummary? = null
)

@JsonClass(generateAdapter = true)
data class PortalNotification(
    val id: String,
    val type: String, // 'orcamento', 'status', 'finalizacao', 'anexo'
    val title: String,
    val body: String,
    val read: Boolean,
    val serviceOrderId: String? = null,
    val quoteId: String? = null,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class PortalDashboard(
    val organization: Organization,
    val customer: Customer,
    val vehicle: Vehicle,
    val serviceOrders: List<ServiceOrder> = emptyList(),
    val quotes: List<PortalQuoteRow> = emptyList(),
    val attachments: List<ServiceOrderAttachment> = emptyList()
)

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val cpf: String,
    val plate: String
)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val accessToken: String,
    val organizationName: String,
    val customerName: String,
    val plate: String
)

@JsonClass(generateAdapter = true)
data class ApproveQuoteRequest(
    val lines: List<ApprovedLine>? = null,
    val comment: String? = null
)

@JsonClass(generateAdapter = true)
data class ApprovedLine(
    val lineId: String,
    val approved: Boolean
)

@JsonClass(generateAdapter = true)
data class RejectQuoteRequest(
    val comment: String? = null
)

@JsonClass(generateAdapter = true)
data class SwitchVehicleRequest(
    val vehicleId: String
)

@JsonClass(generateAdapter = true)
data class PublicBrandingResponse(
    val name: String? = null,
    val tradeName: String? = null,
    val logoUrl: String? = null,
    val primaryColor: String? = null,
    val accentColor: String? = null
)

@JsonClass(generateAdapter = true)
data class PublicQuoteResponse(
    val organizationName: String,
    val customerName: String,
    val vehicle: Vehicle,
    val quote: PortalQuoteRow,
    val attachments: List<ServiceOrderAttachment> = emptyList()
)

@JsonClass(generateAdapter = true)
data class FcmRegisterRequest(
    val token: String,
    val platform: String? = "android"
)
