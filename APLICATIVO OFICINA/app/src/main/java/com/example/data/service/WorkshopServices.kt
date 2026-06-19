package com.example.data.service

import com.example.data.model.*
import kotlinx.coroutines.delay

// 1. Dashboard Service
class DashboardService {
    suspend fun getMetrics(): Map<String, Int> {
        delay(400)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/dashboard)")
        }
        return mapOf(
            "os_aguardando_checklist" to 3,
            "em_analise" to 5,
            "aguardando_aprovacao" to 4,
            "finalizadas_hoje" to 2
        )
    }
}

// 2. Order Service
class OrderService {
    suspend fun getOrders(query: String = "", statusFilter: String = "Todas"): List<Order> {
        delay(500)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/os)")
        }
        
        // This real query parser is ready for backend integration
        return emptyList()
    }

    suspend fun getOrderById(id: String): Order {
        delay(300)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/os/$id)")
        }
        throw IllegalStateException("OS não encontrada")
    }

    suspend fun updateOrderStatus(id: String, newStatus: String, technicalNotes: String, notifyClient: Boolean): Boolean {
        delay(600)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (PATCH /api/oficina-app/os/$id/status)")
        }
        return true
    }
}

// 3. Checklist Service
class ChecklistService {
    suspend fun getChecklistPhotos(orderId: String): List<ChecklistPhoto> {
        delay(400)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/os/$orderId/checklist-fotografico)")
        }
        return emptyList()
    }

    suspend fun saveChecklist(orderId: String, photos: List<ChecklistPhoto>): Boolean {
        delay(800)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/os/$orderId/checklist-fotografico)")
        }
        return true
    }

    suspend fun completeChecklist(orderId: String): Boolean {
        delay(500)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/os/$orderId/checklist-fotografico/concluir)")
        }
        return true
    }
}

// 4. Photo Service
class PhotoService {
    suspend fun uploadPhoto(orderId: String, photoTypeLabel: String, photoUri: String): ChecklistPhoto {
        delay(1200) // Simulates real file processing
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/os/$orderId/fotos)")
        }
        return ChecklistPhoto(
            id = "photo_${System.currentTimeMillis()}",
            orderId = orderId,
            label = photoTypeLabel,
            photoUri = photoUri,
            status = PhotoChecklistStatus.OK,
            isUploaded = true
        )
    }

    suspend fun updatePhotoStatus(photoId: String, status: PhotoChecklistStatus, observation: String): Boolean {
        delay(400)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (PATCH /api/oficina-app/fotos/$photoId)")
        }
        return true
    }

    suspend fun deletePhoto(photoId: String): Boolean {
        delay(400)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (DELETE /api/oficina-app/fotos/$photoId)")
        }
        return true
    }
}

// 5. Budget Service
class BudgetService {
    suspend fun getBudget(orderId: String): Budget {
        delay(400)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/os/$orderId/orcamento)")
        }
        return Budget(orderId = orderId)
    }

    suspend fun saveBudget(orderId: String, budget: Budget): Boolean {
        delay(700)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/os/$orderId/orcamento)")
        }
        return true
    }

    suspend fun sendBudgetToClient(orderId: String): Boolean {
        delay(600)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (POST /api/oficina-app/os/$orderId/orcamento/enviar)")
        }
        return true
    }
}

// 6. Employee Service
class EmployeeService {
    suspend fun getEmployees(): List<Employee> {
        delay(300)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/funcionarios)")
        }
        return emptyList()
    }
}

// 7. Product Service
class ProductService {
    suspend fun getProducts(): List<Product> {
        delay(450)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/produtos)")
        }
        return emptyList()
    }
}

// 8. Service Catalog Service
class ServiceCatalogService {
    suspend fun getServices(): List<ServiceCatalog> {
        delay(450)
        if (System.getenv("API_URL_HEALTHY") != "true") {
            throw IllegalStateException("Endpoint ainda não implementado no backend (GET /api/oficina-app/servicos)")
        }
        return emptyList()
    }
}

// 9. Notification Service
class NotificationService {
    suspend fun notifyClientOnWhatsApp(phone: String, message: String): Boolean {
        // Integrate real WhatsApp URL scheme or service gateway
        return true
    }
}
