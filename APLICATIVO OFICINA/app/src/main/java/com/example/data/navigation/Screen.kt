package com.example.data.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object Orders : Screen("orders")
    object Profile : Screen("profile")
    
    // Screens with parameterized IDs
    object OrderDetails : Screen("order_details/{orderId}") {
        fun createRoute(orderId: String) = "order_details/$orderId"
    }
    object PhotoChecklist : Screen("photo_checklist/{orderId}") {
        fun createRoute(orderId: String) = "photo_checklist/$orderId"
    }
    object WorkPhotos : Screen("work_photos/{orderId}") {
        fun createRoute(orderId: String) = "work_photos/$orderId"
    }
    object Budget : Screen("budget/{orderId}") {
        fun createRoute(orderId: String) = "budget/$orderId"
    }
    object UpdateOrder : Screen("update_order/{orderId}") {
        fun createRoute(orderId: String) = "update_order/$orderId"
    }
    object CreateServiceOrder : Screen("create_service_order")
}
