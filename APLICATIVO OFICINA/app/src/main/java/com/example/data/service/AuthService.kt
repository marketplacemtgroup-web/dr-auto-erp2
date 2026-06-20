package com.example.data.service

import com.example.data.api.LoginRequest
import com.example.data.mapper.ApiMappers
import com.example.data.model.User
import retrofit2.HttpException

class AuthService {
    private val api get() = HttpClient.api

    suspend fun login(email: String, password: String): User {
        if (HttpClient.useMockData) {
            return mockUser(email)
        }
        return try {
            val session = api.login(LoginRequest(email.trim(), password))
            val user = ApiMappers.toUser(session)
            SessionManager.saveSession(user, session.accessToken)
            user
        } catch (e: HttpException) {
            throw mapHttpError(e)
        }
    }

    suspend fun restoreSession(): User? {
        if (!SessionManager.isLoggedIn) return null
        if (HttpClient.useMockData) return SessionManager.currentUser
        return try {
            val session = api.me()
            val user = ApiMappers.toUser(session)
            SessionManager.saveSession(user, session.accessToken)
            user
        } catch (_: Exception) {
            SessionManager.clearSession()
            null
        }
    }

    suspend fun getCurrentUser(): User =
        SessionManager.currentUser ?: throw IllegalStateException("Trabalhador não autenticado")

    suspend fun logout() {
        SessionManager.clearSession()
    }

    private suspend fun mockUser(email: String): User {
        val user = User(
            id = "mock-user",
            name = "Usuário Demo",
            email = email,
            role = "mecanico",
            permissions = listOf(
                "dashboard.view",
                "service_orders.manage",
                "quotes.manage",
                "inventory.manage",
            ),
            workshop = "OFICINA DO BETO",
        )
        SessionManager.saveSession(user, "mock-token")
        return user
    }

    private fun mapHttpError(e: HttpException): Exception {
        val msg = when (e.code()) {
            401 -> "Credenciais inválidas"
            403 -> "Sem permissão para acessar"
            else -> "Erro ao conectar (${e.code()})"
        }
        return ApiException(e.code(), msg)
    }
}
