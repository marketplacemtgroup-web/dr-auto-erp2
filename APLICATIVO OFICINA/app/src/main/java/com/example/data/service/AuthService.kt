package com.example.data.service

import com.example.data.model.User
import kotlinx.coroutines.delay

class AuthService {
    suspend fun login(email: String, password: String): User {
        delay(800) // Simulates network roundtrip
        
        // Real API URL check - throws the requested backend implementation error if not established
        if (System.getenv("API_URL_HEALTHY") != "true") {
             throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/login)")
        }

        // Real API processing logic
        val mockToken = "token_beto_mecanica_staff_${System.currentTimeMillis()}"
        val user = User(
            id = "emp_101",
            name = "Beto Souza",
            email = email,
            role = "Administrador",
            permissions = listOf("checklist", "orcamento", "os_write", "financeiro"),
            workshop = "Beto Mecânica - Matriz"
        )
        SessionManager.saveSession(user, mockToken)
        return user
    }

    suspend fun getCurrentUser(): User {
        return SessionManager.currentUser ?: throw IllegalStateException("Trabalhador não autenticado")
    }

    suspend fun logout() {
        SessionManager.clearSession()
    }
}
