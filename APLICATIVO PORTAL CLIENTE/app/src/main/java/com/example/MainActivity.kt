package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.BrandPalette
import com.example.ui.screens.*
import com.example.viewmodels.PortalViewModel

// --- ROUTE DEFINITIONS ---
sealed class Screen {
    object Login : Screen()
    object Home : Screen()
    data class OrderDetails(val orderId: String) : Screen()
    data class QuoteDetails(val quoteId: String) : Screen()
    object History : Screen()
    object Support : Screen()
    object Notifications : Screen()
    object Profile : Screen()
}

class MainActivity : ComponentActivity() {
    private val viewModel: PortalViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            PortalAppShell(viewModel = viewModel, activity = this)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PortalAppShell(
    viewModel: PortalViewModel,
    activity: ComponentActivity
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val notifications by viewModel.notifications.collectAsState()

    // Setup custom BackStack navigation system for perfect stability and simplicity
    val backStack = remember { mutableStateListOf<Screen>() }
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Login) }

    // Navigation function
    val navigateTo: (Screen) -> Unit = { screen ->
        if (screen != currentScreen) {
            backStack.add(currentScreen)
            currentScreen = screen
        }
    }

    // Go Back function
    val goBack: () -> Unit = {
        if (backStack.isNotEmpty()) {
            currentScreen = backStack.removeAt(backStack.lastIndex)
        } else {
            activity.finish()
        }
    }

    // Handle initial route
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            backStack.clear()
            currentScreen = Screen.Home
        } else {
            backStack.clear()
            currentScreen = Screen.Login
        }
    }

    // Bind system back button callback
    DisposableEffect(currentScreen) {
        val callback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (currentScreen is Screen.Login) {
                    activity.finish()
                } else if (currentScreen is Screen.Home) {
                    // Home is bottom root, close app on double tap or exit
                    activity.finish()
                } else {
                    goBack()
                }
            }
        }
        activity.onBackPressedDispatcher.addCallback(callback)
        onDispose {
            callback.remove()
        }
    }

    // Determine bottom tab visibility
    val showTabBar = currentScreen is Screen.Home ||
                     currentScreen is Screen.History ||
                     currentScreen is Screen.Notifications ||
                     currentScreen is Screen.Profile

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showTabBar) {
                NavigationBar(
                    containerColor = Color.White,
                    tonalElevation = 8.dp,
                    modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
                ) {
                    // 1. HOME TAB
                    NavigationBarItem(
                        selected = currentScreen is Screen.Home,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Início") },
                        label = { Text("Início", fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandPalette.DeepBlue,
                            selectedTextColor = BrandPalette.DeepBlue,
                            indicatorColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
                            unselectedTextColor = Color.Gray,
                            unselectedIconColor = Color.Gray
                        )
                    )

                    // 2. HISTORY / OS LIST TAB
                    NavigationBarItem(
                        selected = currentScreen is Screen.History,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.History
                        },
                        icon = { Icon(Icons.Default.History, contentDescription = "Histórico") },
                        label = { Text("Histórico", fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandPalette.DeepBlue,
                            selectedTextColor = BrandPalette.DeepBlue,
                            indicatorColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
                            unselectedTextColor = Color.Gray,
                            unselectedIconColor = Color.Gray
                        )
                    )

                    // 3. NOTIFICATIONS TAB WITH RED BADGE
                    val unreadCount = notifications.count { !it.read }
                    NavigationBarItem(
                        selected = currentScreen is Screen.Notifications,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Notifications
                        },
                        icon = {
                            BadgedBox(
                                badge = {
                                    if (unreadCount > 0) {
                                        Box(
                                            modifier = Modifier
                                                .size(16.dp)
                                                .clip(CircleShape)
                                                .background(BrandPalette.StatusErrorText),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = unreadCount.toString(),
                                                color = Color.White,
                                                fontSize = 9.sp,
                                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            ) {
                                Icon(Icons.Default.Notifications, contentDescription = "Notificações")
                            }
                        },
                        label = { Text("Mensagens", fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandPalette.DeepBlue,
                            selectedTextColor = BrandPalette.DeepBlue,
                            indicatorColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
                            unselectedTextColor = Color.Gray,
                            unselectedIconColor = Color.Gray
                        )
                    )

                    // 4. PROFILE TAB
                    NavigationBarItem(
                        selected = currentScreen is Screen.Profile,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Profile
                        },
                        icon = { Icon(Icons.Default.Person, contentDescription = "Perfil") },
                        label = { Text("Perfil", fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = BrandPalette.DeepBlue,
                            selectedTextColor = BrandPalette.DeepBlue,
                            indicatorColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
                            unselectedTextColor = Color.Gray,
                            unselectedIconColor = Color.Gray
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AnimatedContent(
                targetState = currentScreen,
                transitionSpec = {
                    fadeIn() togetherWith fadeOut()
                },
                label = "ScreenTransition"
            ) { screen ->
                when (screen) {
                    is Screen.Login -> LoginScreen(
                        viewModel = viewModel,
                        onLoginSuccess = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        }
                    )

                    is Screen.Home -> HomeScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { orderId -> navigateTo(Screen.OrderDetails(orderId)) },
                        onNavigateToQuoteDetails = { quoteId -> navigateTo(Screen.QuoteDetails(quoteId)) },
                        onNavigateToHistory = { navigateTo(Screen.History) },
                        onNavigateToSupport = { navigateTo(Screen.Support) }
                    )

                    is Screen.OrderDetails -> OrderDetailsScreen(
                        orderId = screen.orderId,
                        viewModel = viewModel,
                        onNavigateToQuote = { quoteId -> navigateTo(Screen.QuoteDetails(quoteId)) },
                        onBack = goBack
                    )

                    is Screen.QuoteDetails -> BudgetScreen(
                        quoteId = screen.quoteId,
                        viewModel = viewModel,
                        onBack = goBack
                    )

                    is Screen.History -> ServiceHistoryScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { orderId -> navigateTo(Screen.OrderDetails(orderId)) },
                        onBack = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        }
                    )

                    is Screen.Support -> SupportScreen(
                        viewModel = viewModel,
                        onBack = goBack
                    )

                    is Screen.Notifications -> NotificationsScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { orderId -> navigateTo(Screen.OrderDetails(orderId)) },
                        onNavigateToQuoteDetails = { quoteId -> navigateTo(Screen.QuoteDetails(quoteId)) }
                    )

                    is Screen.Profile -> ProfileScreen(
                        viewModel = viewModel,
                        onLogout = {
                            backStack.clear()
                            currentScreen = Screen.Login
                        }
                    )
                }
            }
        }
    }
}
