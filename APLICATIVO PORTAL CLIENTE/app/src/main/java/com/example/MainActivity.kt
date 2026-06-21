package com.example

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.isSystemInDarkTheme
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
import com.example.ui.theme.LocalDynamicBrand
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.ThemeMode
import com.example.viewmodels.PortalViewModel

sealed class Screen {
    object Splash : Screen()
    object Login : Screen()
    data class AccessLink(val token: String) : Screen()
    data class PublicQuote(val token: String) : Screen()
    object Home : Screen()
    object Orders : Screen()
    data class OrderDetails(val orderId: String) : Screen()
    data class QuoteDetails(val quoteId: String) : Screen()
    object Notifications : Screen()
    object Profile : Screen()
    object ProfileData : Screen()
    object ProfileVehicles : Screen()
    object ProfileHistory : Screen()
    object ProfileSupport : Screen()
    object ProfilePrivacy : Screen()
}

fun parseDeepLink(uri: Uri?): Screen? {
    if (uri == null) return null

    when (uri.host?.lowercase()) {
        "acesso" -> {
            val token = uri.pathSegments.lastOrNull()?.takeIf { it.isNotBlank() }
            if (token != null) return Screen.AccessLink(token)
        }
        "orcamento" -> {
            val token = uri.pathSegments.lastOrNull()?.takeIf { it.isNotBlank() }
            if (token != null) return Screen.PublicQuote(token)
        }
    }

    val segments = uri.path?.trim('/')?.split('/')?.filter { it.isNotBlank() } ?: return null
    if (segments.size >= 2) {
        return when (segments[0].lowercase()) {
            "acesso" -> Screen.AccessLink(segments[1])
            "orcamento" -> Screen.PublicQuote(segments[1])
            else -> null
        }
    }
    return null
}

class MainActivity : ComponentActivity() {
    private val viewModel: PortalViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val brandColors by viewModel.brandColors.collectAsState()
            val themeMode by viewModel.themeMode.collectAsState()
            val isSystemDark = isSystemInDarkTheme()

            LaunchedEffect(themeMode, isSystemDark) {
                viewModel.syncThemeWithSystem(isSystemDark)
            }

            val darkTheme = when (themeMode) {
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
                ThemeMode.SYSTEM -> isSystemDark
            }

            CompositionLocalProvider(LocalDynamicBrand provides brandColors) {
                MyApplicationTheme(darkTheme = darkTheme, dynamicColor = false) {
                    PortalAppShell(
                        viewModel = viewModel,
                        activity = this,
                        initialDeepLink = parseDeepLink(intent?.data),
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PortalAppShell(
    viewModel: PortalViewModel,
    activity: ComponentActivity,
    initialDeepLink: Screen? = null,
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    val themeMode by viewModel.themeMode.collectAsState()

    val backStack = remember { mutableStateListOf<Screen>() }
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Splash) }
    var splashDone by remember { mutableStateOf(false) }
    var pendingDeepLink by remember { mutableStateOf(initialDeepLink) }

    LaunchedEffect(activity.intent?.data) {
        parseDeepLink(activity.intent?.data)?.let { pendingDeepLink = it }
    }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(2600)
        splashDone = true
    }

    LaunchedEffect(splashDone, pendingDeepLink, isLoggedIn) {
        if (!splashDone) return@LaunchedEffect
        when (val link = pendingDeepLink) {
            is Screen.AccessLink -> {
                pendingDeepLink = null
                backStack.clear()
                currentScreen = link
            }
            is Screen.PublicQuote -> {
                pendingDeepLink = null
                backStack.clear()
                currentScreen = link
            }
            else -> {
                if (isLoggedIn) {
                    backStack.clear()
                    currentScreen = Screen.Home
                } else {
                    backStack.clear()
                    currentScreen = Screen.Login
                }
            }
        }
    }

    LaunchedEffect(isLoggedIn) {
        if (!splashDone) return@LaunchedEffect
        if (pendingDeepLink != null) return@LaunchedEffect
        if (isLoggedIn && currentScreen is Screen.Login) {
            backStack.clear()
            currentScreen = Screen.Home
        } else if (!isLoggedIn && currentScreen !is Screen.Login &&
            currentScreen !is Screen.Splash && currentScreen !is Screen.AccessLink &&
            currentScreen !is Screen.PublicQuote
        ) {
            backStack.clear()
            currentScreen = Screen.Login
        }
    }

    val navigateTo: (Screen) -> Unit = { screen ->
        if (screen != currentScreen) {
            backStack.add(currentScreen)
            currentScreen = screen
        }
    }

    val goBack: () -> Unit = {
        if (backStack.isNotEmpty()) {
            currentScreen = backStack.removeAt(backStack.lastIndex)
        } else {
            activity.finish()
        }
    }

    DisposableEffect(currentScreen) {
        val callback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when (currentScreen) {
                    is Screen.Splash, is Screen.Login -> activity.finish()
                    is Screen.Home -> activity.finish()
                    is Screen.AccessLink, is Screen.PublicQuote -> {
                        if (isLoggedIn) {
                            backStack.clear()
                            currentScreen = Screen.Home
                        } else {
                            backStack.clear()
                            currentScreen = Screen.Login
                        }
                    }
                    else -> goBack()
                }
            }
        }
        activity.onBackPressedDispatcher.addCallback(callback)
        onDispose { callback.remove() }
    }

    val showTabBar = currentScreen is Screen.Home ||
        currentScreen is Screen.Orders ||
        currentScreen is Screen.Notifications ||
        currentScreen is Screen.Profile

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showTabBar) {
                NavigationBar(
                    containerColor = BrandPalette.NavBg,
                    tonalElevation = 8.dp,
                    modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
                ) {
                    NavigationBarItem(
                        selected = currentScreen is Screen.Home,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Início") },
                        label = { Text("Início", fontSize = 11.sp) },
                        colors = navItemColors()
                    )
                    NavigationBarItem(
                        selected = currentScreen is Screen.Orders,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Orders
                        },
                        icon = { Icon(Icons.Default.Assignment, contentDescription = "OS") },
                        label = { Text("OS", fontSize = 11.sp) },
                        colors = navItemColors()
                    )
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
                        label = { Text("Notificações", fontSize = 11.sp) },
                        colors = navItemColors()
                    )
                    NavigationBarItem(
                        selected = currentScreen is Screen.Profile,
                        onClick = {
                            backStack.clear()
                            currentScreen = Screen.Profile
                        },
                        icon = { Icon(Icons.Default.Person, contentDescription = "Perfil") },
                        label = { Text("Perfil", fontSize = 11.sp) },
                        colors = navItemColors()
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
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "ScreenTransition"
            ) { screen ->
                when (screen) {
                    is Screen.Splash -> SplashScreen(viewModel = viewModel)

                    is Screen.Login -> LoginScreen(
                        viewModel = viewModel,
                        onLoginSuccess = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        }
                    )

                    is Screen.AccessLink -> AccessLinkScreen(
                        token = screen.token,
                        viewModel = viewModel,
                        onSuccess = {
                            backStack.clear()
                            currentScreen = Screen.Home
                        },
                        onGoToLogin = {
                            backStack.clear()
                            currentScreen = Screen.Login
                        }
                    )

                    is Screen.PublicQuote -> PublicQuoteScreen(
                        token = screen.token,
                        viewModel = viewModel,
                        onBack = {
                            if (isLoggedIn) {
                                backStack.clear()
                                currentScreen = Screen.Home
                            } else {
                                backStack.clear()
                                currentScreen = Screen.Login
                            }
                        }
                    )

                    is Screen.Home -> HomeScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { navigateTo(Screen.OrderDetails(it)) },
                        onNavigateToQuoteDetails = { navigateTo(Screen.QuoteDetails(it)) },
                        onNavigateToHistory = { navigateTo(Screen.Orders) },
                        onNavigateToSupport = { navigateTo(Screen.ProfileSupport) },
                        onToggleTheme = { viewModel.toggleThemeMode() },
                        themeMode = themeMode,
                    )

                    is Screen.Orders -> OrdersScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { navigateTo(Screen.OrderDetails(it)) },
                    )

                    is Screen.OrderDetails -> OrderDetailsScreen(
                        orderId = screen.orderId,
                        viewModel = viewModel,
                        onNavigateToQuote = { navigateTo(Screen.QuoteDetails(it)) },
                        onBack = goBack
                    )

                    is Screen.QuoteDetails -> BudgetScreen(
                        quoteId = screen.quoteId,
                        viewModel = viewModel,
                        onBack = goBack
                    )

                    is Screen.Notifications -> NotificationsScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { navigateTo(Screen.OrderDetails(it)) },
                        onNavigateToQuoteDetails = { navigateTo(Screen.QuoteDetails(it)) }
                    )

                    is Screen.Profile -> ProfileHubScreen(
                        viewModel = viewModel,
                        onNavigate = { navigateTo(it) },
                        onLogout = {
                            backStack.clear()
                            currentScreen = Screen.Login
                        },
                        onToggleTheme = { viewModel.toggleThemeMode() },
                        themeMode = themeMode,
                    )

                    is Screen.ProfileData -> ProfileDataScreen(viewModel = viewModel, onBack = goBack)
                    is Screen.ProfileVehicles -> ProfileVehiclesScreen(viewModel = viewModel, onBack = goBack)
                    is Screen.ProfileHistory -> ProfileHistoryScreen(
                        viewModel = viewModel,
                        onNavigateToOrderDetails = { navigateTo(Screen.OrderDetails(it)) },
                        onBack = goBack,
                    )
                    is Screen.ProfileSupport -> SupportScreen(viewModel = viewModel, onBack = goBack)
                    is Screen.ProfilePrivacy -> ProfilePrivacyScreen(onBack = goBack)
                }
            }
        }
    }
}

@Composable
private fun navItemColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = BrandPalette.DeepBlue,
    selectedTextColor = BrandPalette.DeepBlue,
    indicatorColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
    unselectedTextColor = Color.Gray,
    unselectedIconColor = Color.Gray
)
