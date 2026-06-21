package com.example.data.api

import com.example.data.*
import retrofit2.Response
import retrofit2.http.*
import java.io.Serializable

// Request payloads
data class LoginRequest(
    val email: String,
    val password: String
) : Serializable

data class NestUser(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String?
) : Serializable

data class LoginResponse(
    val accessToken: String,
    val user: NestUser,
    val organizationId: String,
    val organizationName: String,
    val role: String,
    val permissions: List<String>
) : Serializable

data class BrandingResponse(
    val name: String?,
    val tradeName: String?,
    val logoUrl: String?,
    val primaryColor: String?,
    val accentColor: String?,
) : Serializable

data class PunchClockRequest(
    val entryType: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val addressApprox: String? = null,
    val device: String = "Android Device",
    val notes: String? = null,
    val clientRecordedAt: String? = null,
) : Serializable

data class PushTokenPayload(
    val token: String,
    val platform: String = "android"
) : Serializable

data class NewRequestPayload(
    val requestType: String,
    val referenceDate: String,
    val description: String,
    val attachmentUrl: String? = null,
    val metadata: Map<String, String>? = null
) : Serializable

// Response wrappers for lists or maps
data class BaseListResponse<T>(
    val data: List<T>,
    val pagination: PaginationInfo? = null
) : Serializable

data class PaginationInfo(
    val page: Int,
    val limit: Int,
    val total: Int,
    val total_pages: Int
) : Serializable

data class DashboardResponse(
    val funcionario: DashboardFuncionario,
    val resumo: DashboardResumo,
    val regras_comissao: List<CommissionRuleDto>? = null,
    val avisos: List<DashboardAviso>? = null,
) : Serializable

data class CommissionRuleDto(
    val ruleType: String? = null,
    val percentage: Double? = null,
    val fixedAmount: Double? = null,
    val description: String? = null,
) : Serializable

data class ColaboradorMeResponse(
    val id: String,
    val nome: String,
    val cargo: String,
    val cpf: String? = null,
    val rg: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val birthDate: String? = null,
    val hireDate: String? = null,
    val photoUrl: String? = null,
    val jobTitle: String? = null,
    val regras_comissao: List<CommissionRuleDto>? = null,
) : Serializable

data class PhotoUploadResponse(
    val photoUrl: String,
) : Serializable

data class ApiPerformanceResponse(
    val periodo: String,
    val os_finalizadas: Int,
    val servicos_executados: Int,
    val checklists_realizados: Int,
    val fotos_enviadas: Int,
    val comissao_gerada: Double,
    val tempo_medio_os: String,
    val series_semanal: List<WeeklyPerformancePoint>? = null,
    val metas: List<MetricGoal>,
) : Serializable

data class WeeklyPerformancePoint(
    val semana: String,
    val os: Int,
    val servicos: Int,
    val comissao: Double,
) : Serializable

data class ApiEmployeeDocument(
    val id: String,
    val nome: String,
    val tipo: String,
    val data: String,
    val url: String? = null,
    val tamanho: String? = null,
) : Serializable

data class DashboardFuncionario(
    val id: String,
    val nome: String,
    val cargo: String
) : Serializable

data class DashboardResumo(
    val os_oficina_hoje: Int? = null,
    val os_minhas_em_execucao: Int? = null,
    val os_produzidas_mes: Int? = null,
    val os_atribuidas_hoje: Int? = null,
    val os_em_execucao: Int? = null,
    val comissao_prevista: Double? = null,
    val comissao_prevista_mes: Double? = null,
    val comissao_mes_a_receber: Double? = null,
    val comissao_hoje: Double? = null,
    val comissao_paga_mes: Double? = null,
    val comissao_pendente: Double? = null,
    val comissao_aprovada_mes: Double? = null,
    val proximo_turno: DashboardTurno? = null,
    val ponto_hoje: DashboardPonto? = null,
) : Serializable

data class DashboardTurno(
    val data: String,
    val inicio: String,
    val fim: String
) : Serializable

data class DashboardPonto(
    val entrada: String?,
    val intervalo_inicio: String?,
    val intervalo_fim: String?,
    val saíde: String?, // Typo safe alias
    val status: String
) : Serializable

data class DashboardAviso(
    val id: String,
    val titulo: String,
    val lido: Boolean
) : Serializable

data class CommissionSummaryResponse(
    val resumo: CommissionTotals,
    val data: List<Commission>
) : Serializable

data class CommissionTotals(
    val prevista: Double,
    val pendente: Double,
    val aprovada: Double,
    val paga: Double
) : Serializable

data class TimeClockStatusResponse(
    val data: String,
    val registros: List<TimeClockRecord>,
    val total_parcial: String,
    val proxima_acao: String // "registrar_entrada" | "iniciar_intervalo" | "voltar_do_intervalo" | "registrar_saida" | "finalizado"
) : Serializable

data class WeeklyScheduleResponse(
    val periodo: SchedulePeriod,
    val escala: List<ScheduleItem>
) : Serializable

data class SchedulePeriod(
    val inicio: String,
    val fim: String
) : Serializable

// Real Time Clock DTOs from NestJS backend
data class TimeClockDay(
    val id: String,
    val workDate: String,
    val clockIn: String?,
    val breakStart: String?,
    val breakEnd: String?,
    val clockOut: String?,
    val workedMinutes: Int,
    val expectedMinutes: Int,
    val lateMinutes: Int,
    val overtimeMinutes: Int,
    val earlyLeaveMinutes: Int,
    val status: String, // "VALIDO" | "PENDENTE" | "AJUSTADO" | "RECUSADO" | "CANCELADO"
    val employee: TimeClockEmployee,
    val schedule: ScheduleItemDto?
) : Serializable

data class TimeClockEmployee(
    val id: String,
    val name: String,
    val jobTitle: JobTitleDto?
) : Serializable

data class JobTitleDto(
    val name: String
) : Serializable

data class ScheduleItemDto(
    val startTime: String?,
    val endTime: String?,
    val breakStart: String?,
    val breakEnd: String?,
    val dayType: String,
    val status: String?
) : Serializable

data class TimeClockEntry(
    val id: String,
    val entryType: String,
    val recordedAt: String,
    val origin: String,
    val status: String
) : Serializable

data class PunchResponse(
    val entry: TimeClockEntry,
    val day: TimeClockDay
) : Serializable

data class ApiScheduleItem(
    val id: String?,
    val scheduleDate: String,
    val dayOfWeek: Int?,
    val dayType: String, // "TRABALHO" | "FOLGA" | ...
    val startTime: String?,
    val endTime: String?,
    val breakStart: String?,
    val breakEnd: String?,
    val status: String?,
    val notes: String?,
    val isRecurring: Boolean? = null,
    val isException: Boolean? = null
) : Serializable

data class ApiEmployeeRequest(
    val id: String,
    val requestType: String,
    val referenceDate: String,
    val description: String,
    val status: String,
    val rejectionReason: String?,
    val createdAt: String,
    val attachmentUrl: String? = null
) : Serializable

interface BetoApi {

    @GET("colaborador-app/me")
    suspend fun getColaboradorMe(): Response<ColaboradorMeResponse>

    @Multipart
    @POST("colaborador-app/me/foto")
    suspend fun uploadColaboradorPhoto(
        @Part photo: okhttp3.MultipartBody.Part,
    ): Response<PhotoUploadResponse>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<LoginResponse>

    @GET("auth/branding")
    suspend fun getBranding(): Response<BrandingResponse>

    @GET("colaborador-app/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    @GET("colaborador-app/minhas-os")
    suspend fun getMyOrders(
        @Query("status") status: String?,
        @Query("periodo") periodo: String?,
        @Query("search") search: String?,
        @Query("page") page: Int?,
        @Query("limit") limit: Int?
    ): Response<BaseListResponse<EmployeeOrder>>

    @GET("colaborador-app/minhas-os/{id}")
    suspend fun getMyOrderDetails(@Path("id") id: String): Response<OrderDetails>

    @GET("colaborador-app/comissoes")
    suspend fun getCommissions(
        @Query("periodo") periodo: String?,
        @Query("status") status: String?,
        @Query("page") page: Int?,
        @Query("limit") limit: Int?
    ): Response<CommissionSummaryResponse>

    @GET("colaborador-app/comissoes/{id}")
    suspend fun getCommissionDetails(@Path("id") id: String): Response<Commission>

    @GET("colaborador-app/ponto/hoje")
    suspend fun getTodayTimeClock(): Response<List<TimeClockDay>>

    @POST("colaborador-app/ponto/bater")
    suspend fun punchClock(@Body body: PunchClockRequest): Response<PunchResponse>

    @GET("colaborador-app/ponto/historico")
    suspend fun getTimeClockHistory(
        @Query("periodStart") periodStart: String?,
        @Query("periodEnd") periodEnd: String?
    ): Response<List<TimeClockDay>>

    @GET("colaborador-app/escala")
    suspend fun getSchedule(
        @Query("periodStart") periodStart: String?,
        @Query("periodEnd") periodEnd: String?
    ): Response<List<ApiScheduleItem>>

    @GET("colaborador-app/solicitacoes")
    suspend fun getRequests(
        @Query("status") status: String?
    ): Response<List<ApiEmployeeRequest>>

    @POST("colaborador-app/solicitacoes")
    suspend fun createRequest(@Body body: NewRequestPayload): Response<ApiEmployeeRequest>

    @PATCH("solicitacoes-funcionarios/{id}/cancelar")
    suspend fun cancelRequest(@Path("id") id: String): Response<ApiEmployeeRequest>

    @GET("colaborador-app/comunicados")
    suspend fun getAnnouncements(): Response<BaseListResponse<Announcement>>

    @POST("colaborador-app/comunicados/{id}/lido")
    suspend fun markAsRead(@Path("id") id: String): Response<Void>

    @GET("colaborador-app/desempenho")
    suspend fun getPerformance(@Query("periodo") periodo: String?): Response<ApiPerformanceResponse>

    @GET("colaborador-app/documentos")
    suspend fun getDocuments(): Response<List<ApiEmployeeDocument>>
}
