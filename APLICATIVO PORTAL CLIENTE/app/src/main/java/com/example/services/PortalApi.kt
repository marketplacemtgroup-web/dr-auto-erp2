package com.example.services

import com.example.types.*
import okhttp3.ResponseBody
import retrofit2.http.*

interface PortalApi {

    @POST("portal/login")
    suspend fun login(
        @Body request: LoginRequest
    ): LoginResponse

    @GET("portal/dashboard")
    suspend fun getDashboard(): PortalDashboard

    @GET("portal/service-orders/{id}")
    suspend fun getServiceOrder(
        @Path("id") id: String
    ): ServiceOrder

    @GET("portal/quotes/{id}")
    suspend fun getQuote(
        @Path("id") id: String
    ): PortalQuoteRow

    @PATCH("portal/quotes/{id}/approve")
    suspend fun approveQuote(
        @Path("id") id: String,
        @Body request: ApproveQuoteRequest
    ): PortalQuoteRow

    @PATCH("portal/quotes/{id}/reject")
    suspend fun rejectQuote(
        @Path("id") id: String,
        @Body request: RejectQuoteRequest
    ): PortalQuoteRow

    @GET("portal/notifications")
    suspend fun getNotifications(): List<PortalNotification>

    @PATCH("portal/notifications/{id}/read")
    suspend fun markNotificationRead(
        @Path("id") id: String
    ): ResponseBody

    @PATCH("portal/notifications/read-all")
    suspend fun markAllNotificationsRead(): ResponseBody

    @GET("portal/vehicles")
    suspend fun getVehicles(): List<Vehicle>

    @POST("portal/switch-vehicle")
    suspend fun switchVehicle(
        @Body request: SwitchVehicleRequest
    ): LoginResponse

    @GET("portal/access/{token}")
    suspend fun accessByToken(
        @Path("token") token: String
    ): LoginResponse

    @GET("auth/branding")
    suspend fun getPublicBranding(): PublicBrandingResponse

    @GET("portal/public/quote/{token}")
    suspend fun getPublicQuote(
        @Path("token") token: String
    ): PublicQuoteResponse

    @PATCH("portal/public/quote/{token}/approve")
    suspend fun approvePublicQuote(
        @Path("token") token: String,
        @Body request: ApproveQuoteRequest
    ): PortalQuoteRow

    @PATCH("portal/public/quote/{token}/reject")
    suspend fun rejectPublicQuote(
        @Path("token") token: String,
        @Body request: RejectQuoteRequest
    ): PortalQuoteRow

    @POST("portal/push/fcm-register")
    suspend fun registerFcmToken(
        @Body request: FcmRegisterRequest
    ): ResponseBody
}
