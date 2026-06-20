package com.example.data.api

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface WorkshopApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthSessionDto

    @GET("auth/me")
    suspend fun me(): AuthSessionDto

    @GET("dashboard/kpis")
    suspend fun dashboardKpis(): DashboardKpisDto

    @GET("dashboard/service-orders-in-progress")
    suspend fun dashboardOrdersInProgress(): List<ServiceOrderRowDto>

    @GET("service-orders")
    suspend fun listServiceOrders(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
    ): List<ServiceOrderRowDto>

    @GET("service-orders/{id}")
    suspend fun getServiceOrder(@Path("id") id: String): ServiceOrderDetailDto

    @PATCH("service-orders/{id}")
    suspend fun updateServiceOrder(
        @Path("id") id: String,
        @Body body: UpdateServiceOrderRequest,
    ): ServiceOrderDetailDto

    @PATCH("service-orders/{id}/checklist")
    suspend fun updateChecklist(
        @Path("id") id: String,
        @Body body: UpdateChecklistRequest,
    ): ServiceOrderDetailDto

    @POST("service-orders/{id}/items")
    suspend fun addServiceOrderItem(
        @Path("id") id: String,
        @Body body: CreateServiceOrderItemRequest,
    ): ServiceOrderDetailDto

    @DELETE("service-orders/{id}/items/{itemId}")
    suspend fun removeServiceOrderItem(
        @Path("id") id: String,
        @Path("itemId") itemId: String,
    ): ServiceOrderDetailDto

    @POST("service-orders/{id}/portal-link")
    suspend fun createPortalLink(@Path("id") id: String): PortalLinkResponseDto

    @GET("attachments/service-order/{serviceOrderId}")
    suspend fun listAttachments(@Path("serviceOrderId") serviceOrderId: String): List<AttachmentDto>

    @POST("attachments/service-order/{serviceOrderId}/prepare-upload")
    suspend fun prepareUpload(
        @Path("serviceOrderId") serviceOrderId: String,
        @Body body: PrepareUploadRequest,
    ): PrepareUploadResponseDto

    @POST("attachments/service-order/{serviceOrderId}/confirm-upload")
    suspend fun confirmUpload(
        @Path("serviceOrderId") serviceOrderId: String,
        @Body body: ConfirmUploadRequest,
    ): AttachmentDto

    @Multipart
    @POST("attachments/service-order/{serviceOrderId}")
    suspend fun uploadServiceOrderAttachment(
        @Path("serviceOrderId") serviceOrderId: String,
        @Part file: MultipartBody.Part,
        @Query("category") category: String? = null,
        @Query("visibleToCustomer") visibleToCustomer: String? = "false",
        @Query("showOnQuote") showOnQuote: String? = "false",
    ): AttachmentDto

    @GET("quotes")
    suspend fun listQuotes(
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
    ): List<QuoteDetailDto>

    @GET("quotes/{id}")
    suspend fun getQuote(@Path("id") id: String): QuoteDetailDto

    @POST("quotes")
    suspend fun createQuote(@Body body: CreateQuoteRequest): QuoteDetailDto

    @PATCH("quotes/{id}")
    suspend fun updateQuote(
        @Path("id") id: String,
        @Body body: UpdateQuoteRequest,
    ): QuoteDetailDto

    @POST("quotes/{id}/share-link")
    suspend fun shareQuoteLink(@Path("id") id: String): ShareLinkResponseDto

    @GET("team/employees/technicians")
    suspend fun listTechnicians(): List<EmployeeRowDto>

    @GET("products")
    suspend fun listProducts(@Query("search") search: String? = null): List<ProductRowDto>

    @GET("service-catalog")
    suspend fun listServiceCatalog(@Query("search") search: String? = null): List<ServiceCatalogRowDto>
}
