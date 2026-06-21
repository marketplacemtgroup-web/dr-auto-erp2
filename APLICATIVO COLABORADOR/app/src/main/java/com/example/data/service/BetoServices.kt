package com.example.data.service

import com.example.data.*
import com.example.data.api.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import org.json.JSONObject
import retrofit2.Response
import java.io.Serializable
import java.text.SimpleDateFormat
import java.util.*

// Custom Exception classes for HTTP errors
class UnauthorizedException(msg: String) : Exception(msg)
class ForbiddenException(msg: String) : Exception(msg)
class ServerException(msg: String) : Exception(msg)
class OfflineException(msg: String) : Exception(msg)

private fun parseErrorMessage(response: Response<*>): String {
    return try {
        val raw = response.errorBody()?.string().orEmpty()
        if (raw.isBlank()) return response.message()
        val json = JSONObject(raw)
        when (val msg = json.opt("message")) {
            is String -> msg
            is org.json.JSONArray -> {
                val parts = (0 until msg.length()).mapNotNull { i ->
                    msg.optString(i).takeIf { it.isNotBlank() }
                }
                parts.joinToString("\n").ifBlank { response.message() }
            }
            else -> response.message()
        }
    } catch (_: Exception) {
        response.message()
    }
}

private fun handleResponseError(code: Int, response: Response<*>): Nothing {
    val message = parseErrorMessage(response)
    when (code) {
        401 -> throw UnauthorizedException("Sessão expirada. Faça login novamente.")
        403 -> throw ForbiddenException(message.ifBlank { "Você não tem permissão para acessar esta área." })
        in 500..599 -> throw ServerException("Erro interno do servidor ($code).")
        else -> throw Exception(message.ifBlank { "Erro na requisição ($code)" })
    }
}

private fun handleException(e: Exception): Nothing {
    if (e is UnauthorizedException || e is ForbiddenException || e is ServerException) {
        throw e
    }
    if (e is java.net.UnknownHostException || e is java.net.SocketTimeoutException || e is java.io.IOException) {
        throw OfflineException("Sem conexão com a internet. Verifique sua rede.")
    }
    throw e
}

private fun mapLoginToUser(body: LoginResponse): User = User(
    id = body.user.id,
    funcionario_id = body.user.id,
    nome = body.user.name,
    cargo = body.role,
    perfil = body.role,
    oficina_id = body.organizationId,
    permissoes = body.permissions,
)

private fun formatIsoToTime(isoStr: String): String {
    return try {
        val cleanIso = isoStr.substringBefore(".")
        val formatIn = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        if (isoStr.endsWith("Z")) {
            formatIn.timeZone = TimeZone.getTimeZone("UTC")
        }
        val date = formatIn.parse(cleanIso) ?: Date()
        val formatOut = SimpleDateFormat("HH:mm", Locale.getDefault())
        formatOut.format(date)
    } catch (e: Exception) {
        if (isoStr.contains("T") && isoStr.length >= 16) {
            isoStr.substringAfter("T").take(5)
        } else {
            isoStr.take(5)
        }
    }
}

fun mapTimeClockDayToUiStatus(day: TimeClockDay, todayStr: String): TimeClockStatusResponse {
    val uiRecords = mutableListOf<TimeClockRecord>()
    
    day.clockIn?.let {
        uiRecords.add(TimeClockRecord("clock_in_${day.id}", "entrada", formatIsoToTime(it), "valido", todayStr))
    }
    day.breakStart?.let {
        uiRecords.add(TimeClockRecord("break_start_${day.id}", "intervalo_inicio", formatIsoToTime(it), "valido", todayStr))
    }
    day.breakEnd?.let {
        uiRecords.add(TimeClockRecord("break_end_${day.id}", "intervalo_fim", formatIsoToTime(it), "valido", todayStr))
    }
    day.clockOut?.let {
        uiRecords.add(TimeClockRecord("clock_out_${day.id}", "saida", formatIsoToTime(it), "valido", todayStr))
    }

    val nextAction = when {
        day.clockIn == null -> "registrar_entrada"
        day.breakStart == null -> "iniciar_intervalo"
        day.breakEnd == null -> "voltar_do_intervalo"
        day.clockOut == null -> "registrar_saida"
        else -> "finalizado"
    }

    val hoursStr = if (day.workedMinutes > 0) {
        val h = day.workedMinutes / 60
        val m = day.workedMinutes % 60
        "${h}h${String.format("%02d", m)}"
    } else {
        "00:00"
    }

    return TimeClockStatusResponse(
        data = todayStr,
        registros = uiRecords,
        total_parcial = hoursStr,
        proxima_acao = nextAction
    )
}

fun mapApiScheduleItemToUi(item: ApiScheduleItem): ScheduleItem {
    val dayStr = try {
        val ymd = item.scheduleDate.substringBefore("T")
        val parts = ymd.split("-")
        if (parts.size >= 3) "${parts[2]}/${parts[1]}" else "21/06"
    } catch (e: Exception) {
        "21/06"
    }

    val weekDays = listOf("Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado")
    val dowStr = if (item.dayOfWeek != null && item.dayOfWeek in 0..6) {
        weekDays[item.dayOfWeek]
    } else {
        val ymd = item.scheduleDate.substringBefore("T")
        try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(ymd)
            if (date != null) {
                val cal = Calendar.getInstance()
                cal.time = date
                val dow = cal.get(Calendar.DAY_OF_WEEK)
                weekDays[dow - 1]
            } else {
                "Segunda-feira"
            }
        } catch (e: Exception) {
            "Segunda-feira"
        }
    }

    val tipoUi = when (item.dayType.uppercase()) {
        "TRABALHO" -> "trabalho"
        "FOLGA" -> "folga"
        "PLANTAO" -> "plantao"
        else -> item.dayType.lowercase()
    }

    val intervalUi = if (item.breakStart != null && item.breakEnd != null) {
        "${item.breakStart.take(5)} às ${item.breakEnd.take(5)}"
    } else null

    return ScheduleItem(
        data = dayStr,
        dia_semana = dowStr,
        inicio = item.startTime?.take(5),
        fim = item.endTime?.take(5),
        intervalo = intervalUi,
        tipo = tipoUi,
        status = item.status?.lowercase() ?: "confirmada"
    )
}

fun mapApiRequestToUi(item: ApiEmployeeRequest): EmployeeRequest {
    val datRef = try {
        val ymd = item.referenceDate.substringBefore("T")
        val parts = ymd.split("-")
        if (parts.size >= 3) "${parts[2]}/${parts[1]}/${parts[0]}" else "25/06/2026"
    } catch (e: Exception) {
        item.referenceDate.take(10)
    }

    val createdStr = try {
        val ymd = item.createdAt.substringBefore("T")
        val parts = ymd.split("-")
        if (parts.size >= 3) "${parts[2]}/${parts[1]}" else "Agora"
    } catch (e: Exception) {
        "Recente"
    }

    return EmployeeRequest(
        id = item.id,
        tipo = item.requestType.lowercase(),
        data_referencia = datRef,
        descricao = item.description,
        status = item.status.lowercase(),
        created_at = createdStr
    )
}

data class AuthResult(
    val token: String,
    val user: User
) : Serializable

class AuthService {
    suspend fun login(email: String, password: String): AuthResult {
        try {
            SessionManager.clearSession()
            val normalizedEmail = email.trim().lowercase()
            val response = HttpClient.api.login(LoginRequest(normalizedEmail, password))
            if (response.isSuccessful) {
                val body = response.body()
                    ?: throw Exception("Resposta de login do servidor está vazia")
                val user = mapLoginToUser(body)
                SessionManager.saveSession(
                    user,
                    body.accessToken.ifBlank { SessionManager.token.orEmpty() },
                )
                return AuthResult(body.accessToken, user)
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun getMe(): User {
        try {
            val response = HttpClient.api.getMe()
            if (response.isSuccessful) {
                val body = response.body() ?: throw Exception("Sem dados de sessão")
                val user = mapLoginToUser(body)
                SessionManager.saveSession(
                    user,
                    body.accessToken.ifBlank { SessionManager.token.orEmpty() },
                )
                return user
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun getBranding(): BrandingResponse? {
        return try {
            val response = HttpClient.api.getBranding()
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }

    fun logoutLocal() {
        SessionManager.clearSession()
    }
}

class DashboardService {
    suspend fun getDashboard(): DashboardResponse? {
        return try {
            val response = HttpClient.api.getDashboard()
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }
}

class ProfileService {
    suspend fun getMe(): ColaboradorMeResponse {
        try {
            val response = HttpClient.api.getColaboradorMe()
            if (response.isSuccessful) {
                return response.body() ?: throw Exception("Perfil não encontrado")
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun uploadPhoto(bytes: ByteArray, mimeType: String): String {
        try {
            val mediaType = mimeType.toMediaTypeOrNull() ?: "image/jpeg".toMediaTypeOrNull()!!
            val body = bytes.toRequestBody(mediaType)
            val part = MultipartBody.Part.createFormData("photo", "photo.jpg", body)
            val response = HttpClient.api.uploadColaboradorPhoto(part)
            if (response.isSuccessful) {
                return response.body()?.photoUrl ?: throw Exception("Upload sem URL")
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }
}

class EmployeeOrderService {
    suspend fun getMyOrders(
        status: String?,
        periodo: String?,
        search: String?,
        page: Int?,
        limit: Int?
    ): BaseListResponse<EmployeeOrder>? {
        return try {
            val response = HttpClient.api.getMyOrders(status, periodo, search, page, limit)
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getMyOrderDetails(id: String): OrderDetails? {
        return try {
            val response = HttpClient.api.getMyOrderDetails(id)
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }
}

class CommissionService {
    suspend fun getCommissions(
        periodo: String?,
        status: String?,
        page: Int?,
        limit: Int?
    ): CommissionSummaryResponse? {
        return try {
            val response = HttpClient.api.getCommissions(periodo, status, page, limit)
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }

    suspend fun getCommissionDetails(id: String): Commission? {
        return try {
            val response = HttpClient.api.getCommissionDetails(id)
            if (response.isSuccessful) response.body() else null
        } catch (_: Exception) {
            null
        }
    }
}

class TimeClockService {
    suspend fun getTodayTimeClock(): TimeClockStatusResponse {
        try {
            val response = HttpClient.api.getTodayTimeClock()
            if (response.isSuccessful) {
                val list = response.body() ?: emptyList()
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                if (list.isNotEmpty()) {
                    return mapTimeClockDayToUiStatus(list.first(), todayStr)
                }
                return TimeClockStatusResponse(
                    data = todayStr,
                    registros = emptyList(),
                    total_parcial = "00:00",
                    proxima_acao = "registrar_entrada",
                )
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun punchClock(payload: PunchClockRequest): TimeClockStatusResponse {
        try {
            val apiEntryType = when (payload.entryType.lowercase()) {
                "entrada", "registrar_entrada" -> "ENTRADA"
                "intervalo_inicio", "iniciar_intervalo" -> "INTERVALO_INICIO"
                "intervalo_fim", "voltar_do_intervalo" -> "INTERVALO_FIM"
                "saida", "registrar_saida", "bater_saida" -> "SAIDA"
                else -> payload.entryType.uppercase()
            }

            val realPayload = PunchClockRequest(
                entryType = apiEntryType,
                latitude = payload.latitude,
                longitude = payload.longitude,
                addressApprox = payload.addressApprox,
                device = payload.device.ifBlank { "Android" },
                notes = payload.notes,
                clientRecordedAt = payload.clientRecordedAt ?: SimpleDateFormat(
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    Locale.US,
                ).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date()),
            )

            val response = HttpClient.api.punchClock(realPayload)
            if (response.isSuccessful) {
                val body = response.body() ?: throw Exception("Resposta nula ao bater ponto")
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                return mapTimeClockDayToUiStatus(body.day, todayStr)
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun getTimeClockHistory(): List<TimeClockRecord> {
        try {
            val cal = Calendar.getInstance()
            val endStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)
            cal.add(Calendar.DAY_OF_YEAR, -30)
            val startStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.time)

            val response = HttpClient.api.getTimeClockHistory(startStr, endStr)
            if (response.isSuccessful) {
                val rawList = response.body() ?: emptyList()
                val mappedRecords = mutableListOf<TimeClockRecord>()
                rawList.forEach { day ->
                    val dayStr = day.workDate.substringBefore("T").let { ymd ->
                        val parts = ymd.split("-")
                        if (parts.size >= 3) "${parts[2]}/${parts[1]}/${parts[0]}" else ymd
                    }
                    day.clockIn?.let {
                        mappedRecords.add(TimeClockRecord("hist_in_${day.id}", "entrada", formatIsoToTime(it), "valido", dayStr))
                    }
                    day.breakStart?.let {
                        mappedRecords.add(TimeClockRecord("hist_bs_${day.id}", "intervalo_inicio", formatIsoToTime(it), "valido", dayStr))
                    }
                    day.breakEnd?.let {
                        mappedRecords.add(TimeClockRecord("hist_be_${day.id}", "intervalo_fim", formatIsoToTime(it), "valido", dayStr))
                    }
                    day.clockOut?.let {
                        mappedRecords.add(TimeClockRecord("hist_out_${day.id}", "saida", formatIsoToTime(it), "valido", dayStr))
                    }
                }
                return mappedRecords
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }
}

class ScheduleService {
    suspend fun getSchedule(inicio: String?, fim: String?): List<ScheduleItem> {
        try {
            val response = HttpClient.api.getSchedule(inicio, fim)
            if (response.isSuccessful) {
                return (response.body() ?: emptyList()).map { mapApiScheduleItemToUi(it) }
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }
}

class RequestService {
    suspend fun getRequests(status: String?): List<EmployeeRequest> {
        try {
            val response = HttpClient.api.getRequests(status)
            if (response.isSuccessful) {
                return (response.body() ?: emptyList()).map { mapApiRequestToUi(it) }
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun createRequest(payload: NewRequestPayload): EmployeeRequest {
        try {
            val apiRequestType = when (payload.requestType.lowercase()) {
                "folga" -> "FOLGA"
                "troca_escala" -> "TROCA_ESCALA"
                "ajuste_ponto" -> "AJUSTE_PONTO"
                "justificativa_atraso" -> "JUSTIFICATIVA_ATRASO"
                "justificativa_falta" -> "JUSTIFICATIVA_FALTA"
                "observacao_gerente" -> "OBSERVACAO_GERENTE"
                else -> payload.requestType.uppercase()
            }

            val apiDateRef = if (payload.referenceDate.contains("/")) {
                val parts = payload.referenceDate.split("/")
                if (parts.size >= 3) "${parts[2]}-${parts[1]}-${parts[0]}" else payload.referenceDate
            } else {
                payload.referenceDate
            }

            val apiPayload = NewRequestPayload(
                requestType = apiRequestType,
                referenceDate = apiDateRef,
                description = payload.description,
                attachmentUrl = payload.attachmentUrl,
                metadata = payload.metadata,
            )

            val response = HttpClient.api.createRequest(apiPayload)
            if (response.isSuccessful) {
                val body = response.body() ?: throw Exception("Erro ao salvar solicitação")
                return mapApiRequestToUi(body)
            } else {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }

    suspend fun cancelRequest(id: String) {
        try {
            val response = HttpClient.api.cancelRequest(id)
            if (!response.isSuccessful) {
                handleResponseError(response.code(), response)
            }
        } catch (e: Exception) {
            handleException(e)
        }
    }
}

class AnnouncementService {
    suspend fun getAnnouncements(): List<Announcement> = emptyList()

    suspend fun markAsRead(id: String) = Unit
}

class PerformanceService {
    suspend fun getPerformance(periodo: String?): PerformanceMetrics? {
        return try {
            val response = HttpClient.api.getPerformance(periodo)
            if (response.isSuccessful) {
                val body = response.body() ?: return null
                PerformanceMetrics(
                    periodo = body.periodo,
                    os_finalizadas = body.os_finalizadas,
                    servicos_executados = body.servicos_executados,
                    checklists_realizados = body.checklists_realizados,
                    fotos_enviadas = body.fotos_enviadas,
                    comissao_gerada = body.comissao_gerada,
                    tempo_medio_os = body.tempo_medio_os,
                    metas = body.metas,
                    series_semanal = body.series_semanal?.map {
                        WeeklyPerformance(it.semana, it.os, it.servicos, it.comissao)
                    } ?: emptyList(),
                )
            } else null
        } catch (_: Exception) {
            null
        }
    }
}

class DocumentService {
    suspend fun getDocuments(): List<EmployeeDocument> {
        return try {
            val response = HttpClient.api.getDocuments()
            if (response.isSuccessful) {
                (response.body() ?: emptyList()).map {
                    EmployeeDocument(
                        id = it.id,
                        nome = it.nome,
                        tipo = it.tipo,
                        data = it.data,
                        tamanho = it.tamanho ?: "—",
                        url = it.url,
                    )
                }
            } else emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }
}

class NotificationService {
    suspend fun registerPushToken(expoPushToken: String) = Unit
}
