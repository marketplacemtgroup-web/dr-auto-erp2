package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.data.navigation.Screen
import com.example.data.service.SessionManager
import com.example.ui.components.*
import com.example.ui.screens.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                MainAppLayout()
            }
        }
    }
}

@Composable
fun MainAppLayout() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val authViewModel: AuthViewModel = viewModel()
    val sessionChecked by authViewModel.sessionChecked.collectAsState()
    val dashboardViewModel: DashboardViewModel = viewModel()
    val ordersViewModel: OrdersViewModel = viewModel()
    val orderDetailsViewModel: OrderDetailsViewModel = viewModel()
    val checklistViewModel: ChecklistViewModel = viewModel()
    val budgetViewModel: BudgetViewModel = viewModel()

    val startDestination = when {
        !sessionChecked -> null
        SessionManager.isLoggedIn -> Screen.Dashboard.route
        else -> Screen.Login.route
    }

    if (startDestination == null) {
        WorkshopBackground(scrimAlpha = 0.55f) {
            LoadingScreen()
        }
        return
    }

    val showBottomBar = currentRoute != null &&
        currentRoute != Screen.Login.route &&
        !currentRoute.startsWith("photo_checklist") &&
        !currentRoute.startsWith("budget") &&
        !currentRoute.startsWith("update_order")

    WorkshopBackground(scrimAlpha = 0.55f) {
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = Color.Transparent,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = DarkSurface,
                    contentColor = MetallicSilver,
                    tonalElevation = 4.dp
                ) {
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Home, contentDescription = "Início") },
                        label = { Text("Início") },
                        selected = currentRoute == Screen.Dashboard.route,
                        onClick = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Dashboard.route) { inclusive = true }
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CrimsonRed,
                            selectedTextColor = FrostWhite,
                            indicatorColor = Graphite,
                            unselectedTextColor = MetallicSilver,
                            unselectedIconColor = MetallicSilver
                        )
                    )

                    NavigationBarItem(
                        icon = { Icon(Icons.AutoMirrored.Filled.Assignment, contentDescription = "OS") },
                        label = { Text("OS") },
                        selected = currentRoute == Screen.Orders.route,
                        onClick = {
                            ordersViewModel.resetToAll()
                            navController.navigate(Screen.Orders.route) {
                                popUpTo(Screen.Orders.route) { inclusive = true }
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CrimsonRed,
                            selectedTextColor = FrostWhite,
                            indicatorColor = Graphite,
                            unselectedTextColor = MetallicSilver,
                            unselectedIconColor = MetallicSilver
                        )
                    )

                    NavigationBarItem(
                        icon = { Icon(Icons.Default.Person, contentDescription = "Perfil") },
                        label = { Text("Perfil") },
                        selected = currentRoute == Screen.Profile.route,
                        onClick = {
                            navController.navigate(Screen.Profile.route) {
                                popUpTo(Screen.Profile.route) { inclusive = true }
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CrimsonRed,
                            selectedTextColor = FrostWhite,
                            indicatorColor = Graphite,
                            unselectedTextColor = MetallicSilver,
                            unselectedIconColor = MetallicSilver
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            // 1. Auth Stack Screen
            composable(Screen.Login.route) {
                LoginScreen(
                    viewModel = authViewModel,
                    onLoginSuccess = {
                        ordersViewModel.loadOrders()
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            // 2. Dashboard Floor Screen
            composable(Screen.Dashboard.route) {
                HomeScreen(
                    viewModel = dashboardViewModel,
                    onNavigateToOrderDetails = { orderId ->
                        navController.navigate(Screen.OrderDetails.createRoute(orderId))
                    },
                    onNavigateToOrdersList = { defaultFilter ->
                        // Dynamically adjust category selection
                        ordersViewModel.updateFilter(defaultFilter)
                        navController.navigate(Screen.Orders.route)
                    }
                )
            }

            // 3. Operational Orders list Screen
            composable(Screen.Orders.route) {
                OrdersScreen(
                    viewModel = ordersViewModel,
                    onNavigateToOrderDetails = { orderId ->
                        navController.navigate(Screen.OrderDetails.createRoute(orderId))
                    },
                    onScreenVisible = { ordersViewModel.loadOrders() },
                )
            }

            // 4. Order Details panel Screen
            composable(
                route = Screen.OrderDetails.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                OrderDetailsScreen(
                    orderId = orderId,
                    viewModel = orderDetailsViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToPhotoChecklist = { id ->
                        navController.navigate(Screen.PhotoChecklist.createRoute(id))
                    },
                    onNavigateToBudget = { id ->
                        navController.navigate(Screen.Budget.createRoute(id))
                    },
                    onNavigateToUpdateOrder = { id ->
                        navController.navigate(Screen.UpdateOrder.createRoute(id))
                    }
                )
            }

            // 5. Photographic Checklist Vistoria Screen
            composable(
                route = Screen.PhotoChecklist.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                PhotoChecklistScreen(
                    orderId = orderId,
                    viewModel = checklistViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onChecklistCompleted = {
                        // After completing the checklist, return to Order Details which will be re-fetched automatically
                        navController.popBackStack()
                    }
                )
            }

            // 6. Dynamic Autopart/Labour Budget Sheet Screen
            composable(
                route = Screen.Budget.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                BudgetScreen(
                    orderId = orderId,
                    viewModel = budgetViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onBudgetSubmitted = {
                        navController.popBackStack()
                    },
                    onBudgetSaved = { /* permanece na tela de orçamento */ }
                )
            }

            // 7. Status change milestone selector screen
            composable(
                route = Screen.UpdateOrder.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                UpdateOrderScreen(
                    orderId = orderId,
                    viewModel = orderDetailsViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onStatusUpdated = {
                        navController.popBackStack()
                    }
                )
            }

            // 8. Staff profile details and logout control
            composable(Screen.Profile.route) {
                ProfileScreen(
                    authViewModel = authViewModel,
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
    }
}
