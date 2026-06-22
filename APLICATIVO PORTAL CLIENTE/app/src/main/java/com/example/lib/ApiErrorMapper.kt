package com.example.lib

import android.util.Log
import com.squareup.moshi.JsonDataException
import retrofit2.HttpException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

object ApiErrorMapper {
    private const val TAG = "PortalApiError"

    fun map(e: Throwable, context: String = "request"): String {
        Log.e(TAG, "Error during $context", e)
        return when (e) {
            is UnknownHostException -> "Sem conexão com a internet."
            is SocketTimeoutException -> "A conexão demorou demais. Tente novamente."
            is JsonDataException -> "Erro ao processar dados do servidor. Tente atualizar o app."
            is HttpException -> mapHttp(e, context)
            else -> when (context) {
                "login" -> "Dados inválidos. Confira o CPF e a placa."
                "access" -> "Link inválido ou expirado."
                "dashboard" -> "Não foi possível carregar as informações do portal."
                "serviceOrder" -> "Não foi possível carregar as informações da OS."
                "quote" -> "Orçamento ainda não disponível."
                "appointments" -> "Não foi possível carregar agendamentos."
                "createAppointment" -> "Não foi possível agendar."
                "cancelAppointment" -> "Não foi possível cancelar."
                "approveQuote" -> "Não foi possível aprovar o orçamento. Tente novamente."
                else -> "Ocorreu um erro. Tente novamente."
            }
        }
    }

    private fun mapHttp(e: HttpException, context: String): String = when (e.code()) {
        401 -> when (context) {
            "login" -> "CPF ou placa inválidos."
            else -> "Sessão expirada. Faça login novamente."
        }
        404 -> when (context) {
            "access", "publicQuote" -> "Link inválido ou expirado."
            else -> "Informação não encontrada."
        }
        in 500..599 -> "Servidor indisponível. Tente mais tarde."
        else -> "Erro ${e.code()}. Tente novamente."
    }
}
