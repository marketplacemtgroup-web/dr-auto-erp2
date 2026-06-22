package com.example.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.lib.PortalDateTime
import com.example.lib.PortalStatus
import com.example.types.*
import com.example.ui.components.*
import com.example.ui.theme.ThemeMode
import com.example.viewmodels.PortalViewModel

// --- INTENT INTEGRATIONS ---
fun launchWhatsApp(context: Context, phone: String, message: String = "") {
    val cleanPhone = phone.replace("[^0-9]".toRegex(), "")
    val finalPhone = if (cleanPhone.length == 11 && !cleanPhone.startsWith("55")) "55$cleanPhone" else cleanPhone
    val intent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("https://wa.me/$finalPhone?text=${Uri.encode(message)}")
    }
    try {
        context.startActivity(intent)
    } catch (e: Exception) {
        Log.e("AppScreens", "WA failure", e)
    }
}

fun launchDialer(context: Context, phone: String) {
    val intent = Intent(Intent.ACTION_DIAL).apply {
        data = Uri.parse("tel:${phone.replace("[^0-9]".toRegex(), "")}")
    }
    context.startActivity(intent)
}

fun launchGoogleMaps(context: Context, address: String) {
    val intent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("geo:0,0?q=${Uri.encode(address)}")
    }
    context.startActivity(intent)
}

// --- INPUT FILTERS (sem máscara: só dígitos / alfanumérico) ---
fun filterCpfInput(input: String): String =
    input.filter { it.isDigit() }.take(11)

fun filterPlateInput(input: String): String =
    input.replace("[^a-zA-Z0-9]".toRegex(), "").uppercase().take(7)


// ==========================================
// 1. LOGIN SCREEN
// ==========================================
@Composable
fun LoginScreen(
    viewModel: PortalViewModel,
    onLoginSuccess: () -> Unit
) {
    var cpf by remember { mutableStateOf("") }
    var plate by remember { mutableStateOf("") }
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val brandingLogo by viewModel.publicBrandingLogoUrl.collectAsState()

    PortalBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            PortalBrandLogo(
                modifier = Modifier
                    .height(72.dp)
                    .padding(bottom = 8.dp),
                logoUrl = brandingLogo,
            )
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Acesse seu acompanhamento",
                color = BrandPalette.SlateGray,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Black,
                ),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Digite seu CPF e a placa do veículo para acompanhar sua ordem de serviço.",
                color = Color(0xFF64748B),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Login card
            Card(
                colors = CardDefaults.cardColors(containerColor = BrandPalette.CardBg),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                ) {
                    Text(
                        text = "Acesse suas informações",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = BrandPalette.SlateGray
                    )
                    Spacer(modifier = Modifier.height(18.dp))

                    InputField(
                        value = cpf,
                        onValueChange = { cpf = filterCpfInput(it) },
                        label = "CPF",
                        placeholder = "00000000000",
                        leadingIcon = Icons.Default.Person,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        testTag = "login_cpf_input"
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    InputField(
                        value = plate,
                        onValueChange = { plate = filterPlateInput(it) },
                        label = "Placa do Veículo",
                        placeholder = "ABC1D23",
                        leadingIcon = Icons.Default.DirectionsCar,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        testTag = "login_plate_input"
                    )

                    if (errorMessage != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(BrandPalette.StatusErrorBg)
                                .padding(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = BrandPalette.StatusErrorText,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = errorMessage ?: "",
                                color = BrandPalette.StatusErrorText,
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    AppButton(
                        text = if (isLoading) "Entrando..." else "Acessar portal",
                        onClick = {
                            viewModel.login(cpf, plate, onLoginSuccess)
                        },
                        enabled = !isLoading && cpf.isNotEmpty() && plate.isNotEmpty(),
                        testTag = "login_submit_button",
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}


// ==========================================
// 2. HOME SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: PortalViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
    onNavigateToQuoteDetails: (String) -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToSupport: () -> Unit,
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToAppointments: () -> Unit = {},
    onToggleTheme: () -> Unit = {},
    themeMode: ThemeMode = ThemeMode.SYSTEM,
) {
    val context = LocalContext.current
    val dashboard by viewModel.dashboard.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    var actingQuoteId by remember { mutableStateOf<String?>(null) }

    val unreadCount = notifications.count { !it.read }

    Scaffold(
        floatingActionButton = {
            val wa = dashboard?.organization?.phone
            if (!wa.isNullOrEmpty()) {
                FloatingActionButton(
                    onClick = { launchWhatsApp(context, wa, "Olá! Sou cliente e gostaria de falar sobre meu veículo.") },
                    containerColor = Color(0xFF25D366),
                    contentColor = Color.White
                ) {
                    Icon(
                        imageVector = Icons.Default.Chat,
                        contentDescription = "Falar com Oficina no Whatsapp",
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        },
        topBar = {
            TopAppBar(
                title = {
                    PortalBrandLogo(modifier = Modifier.height(32.dp))
                },
                actions = {
                    BadgedBox(
                        badge = {
                            if (unreadCount > 0) {
                                Badge { Text(unreadCount.toString()) }
                            }
                        }
                    ) {
                        IconButton(onClick = onNavigateToNotifications) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Notificações",
                                tint = BrandPalette.SlateGray
                            )
                        }
                    }
                    IconButton(onClick = onToggleTheme) {
                        Icon(
                            imageVector = if (themeMode == ThemeMode.DARK) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Alternar tema",
                            tint = BrandPalette.SlateGray
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        }
    ) { innerPadding ->
        PortalBackground(showOverlay = true) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                OfflineBanner(isOffline = isOffline)

                if (isLoading && dashboard == null) {
                    LoadingScreen()
                    return@Column
                }

                val currentData = dashboard
                if (currentData == null) {
                    ErrorState(
                        message = errorMessage ?: "Não foi possível carregar as informações do seu portal.",
                        onRetry = { viewModel.loadAllData() }
                    )
                    return@Column
                }

                val clientName = currentData.customer.name.substringBefore(" ")
                val quotes = currentData.quotes
                val activeOs = currentData.serviceOrders.find { PortalStatus.isInProgress(it.status) }
                val showBudgetShortcut = activeOs != null &&
                    PortalStatus.isAwaitingApproval(activeOs.status) &&
                    PortalStatus.hasPendingQuote(quotes, activeOs.id)
                val pendingQuoteForActiveOs = activeOs?.let { os ->
                    quotes.find { q -> q.serviceOrder?.id == os.id && PortalStatus.quoteNeedsResponse(q) }
                }

                val quickItems = listOf(
                    Triple("Minhas OS", Icons.Default.Assignment, onNavigateToHistory),
                    Triple(
                        if (showBudgetShortcut) "Aprovar Orçamento" else "Preços",
                        Icons.Default.Calculate,
                        {
                            when {
                                pendingQuoteForActiveOs != null -> onNavigateToQuoteDetails(pendingQuoteForActiveOs.id)
                                showBudgetShortcut -> onNavigateToOrderDetails(activeOs!!.id)
                                else -> onNavigateToHistory()
                            }
                        }
                    ),
                    Triple("Agendar", Icons.Default.Event, onNavigateToAppointments),
                    Triple("Notificações", Icons.Default.Notifications, onNavigateToNotifications),
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(vertical = 16.dp)
                ) {
                    item {
                        Column {
                            Text(
                                text = "Olá, $clientName",
                                style = MaterialTheme.typography.headlineSmall.copy(
                                    fontWeight = FontWeight.Black,
                                    color = BrandPalette.SlateGray
                                )
                            )
                            Text(
                                text = currentData.organization.portalWelcome ?: "Bem-vindo(a) ao seu portal",
                                style = MaterialTheme.typography.bodySmall.copy(color = BrandPalette.TextSecondary),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                            if (isRefreshing) {
                                Text(
                                    text = "Atualizando...",
                                    style = MaterialTheme.typography.labelSmall.copy(color = BrandPalette.TextSecondary),
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }
                        }
                    }

                    if (errorMessage != null) {
                        item {
                            AppCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(text = errorMessage ?: "", color = BrandPalette.StatusErrorText, fontSize = 14.sp)
                                    TextButton(onClick = { viewModel.loadAllData() }) {
                                        Text("Tentar novamente")
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Text(
                            text = "MEU VEÍCULO",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = BrandPalette.TextSecondary,
                                letterSpacing = 1.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        VehicleCard(vehicle = currentData.vehicle)
                    }

                    currentData.upcomingAppointment?.let { appt ->
                        item {
                            AppCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text("Próximo agendamento", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(
                                        text = PortalDateTime.formatDate(appt.scheduledAt),
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(top = 4.dp),
                                    )
                                    Text(
                                        text = "Status: ${appt.status}",
                                        fontSize = 12.sp,
                                        color = BrandPalette.TextSecondary,
                                    )
                                }
                            }
                        }
                    }

                    if (currentData.maintenanceReminders.isNotEmpty()) {
                        item {
                            AppCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text("Manutenção preventiva", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    currentData.maintenanceReminders.forEach { reminder ->
                                        val label = if (reminder.type == "OIL_CHANGE") "Troca de óleo" else "Revisão"
                                        Text(
                                            text = "$label — OS #${reminder.serviceOrderNumber}",
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(top = 4.dp),
                                        )
                                    }
                                    TextButton(onClick = onNavigateToAppointments) {
                                        Text("Agendar revisão")
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Text(
                            text = "SERVIÇO EM ANDAMENTO",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = BrandPalette.TextSecondary,
                                letterSpacing = 1.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        if (activeOs != null) {
                            OrderCard(
                                order = activeOs,
                                vehicle = currentData.vehicle,
                                onClick = { onNavigateToOrderDetails(activeOs.id) }
                            )
                        } else {
                            EmptyState(
                                message = "Não encontramos uma OS ativa para este veículo.",
                                icon = Icons.Default.CheckCircle
                            )
                        }
                    }

                    pendingQuotes(quotes).forEach { quote ->
                        item {
                            Text(
                                text = "AÇÃO NECESSÁRIA",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFC2410C),
                                    letterSpacing = 1.sp
                                )
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            BudgetCard(
                                quote = quote,
                                onClick = { onNavigateToQuoteDetails(quote.id) },
                                isActing = actingQuoteId == quote.id,
                                onApprove = {
                                    actingQuoteId = quote.id
                                    viewModel.approveQuote(quote.id, null, null) { actingQuoteId = null }
                                },
                                onReject = {
                                    actingQuoteId = quote.id
                                    viewModel.rejectQuote(quote.id, null) { actingQuoteId = null }
                                },
                            )
                        }
                    }

                    item {
                        Text(
                            text = "SERVIÇOS RÁPIDOS",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = BrandPalette.TextSecondary,
                                letterSpacing = 1.sp
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        QuickServiceGrid(items = quickItems)
                    }
                }
            }
        }
    }
}

private fun pendingQuotes(quotes: List<PortalQuoteRow>) =
    quotes.filter { PortalStatus.quoteNeedsResponse(it) }


// ==========================================
// 3. SERVICE ORDER DETAILS SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailsScreen(
    orderId: String,
    viewModel: PortalViewModel,
    onNavigateToQuote: (String) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val order by viewModel.currentServiceOrder.collectAsState()
    val dashboard by viewModel.dashboard.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadServiceOrderDetails(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalhes da OS #${order?.number ?: ""}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandPalette.DeepBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
        ) {
            OfflineBanner(isOffline = isOffline)

            if (isLoading && order == null) {
                LoadingScreen()
                return@Scaffold
            }

            val currentOrder = order
            if (currentOrder == null) {
                ErrorState(
                    message = "Não foi possível carregar os detalhes desta ordem de serviço.",
                    onRetry = { viewModel.loadServiceOrderDetails(orderId) }
                )
                return@Scaffold
            }

            // Find associated vehicle
            val vehicle = dashboard?.vehicle
            var selectedTab by remember { mutableIntStateOf(0) }
            val allPhotos = remember(currentOrder) {
                val fromGallery = currentOrder.photos?.map { it.url } ?: emptyList()
                val fromChecklist = currentOrder.checklistItems?.mapNotNull { it.photoUrl } ?: emptyList()
                fromGallery + fromChecklist
            }

            DetailTabRow(
                tabs = listOf("Resumo", "Fotos"),
                selectedIndex = selectedTab,
                onTabSelected = { selectedTab = it },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                badgeCounts = listOf(0, allPhotos.size),
            )

            if (selectedTab == 1) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    PhotoGalleryGrid(photos = allPhotos)
                }
            } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
            ) {
                // Info Summary Card
                item {
                    AppCard {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Ordem de Serviço #${currentOrder.number}",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                    Text(
                                        text = "Abertura: ${PortalDateTime.formatDate(currentOrder.createdAt)}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                    )
                                }
                                StatusBadge(status = currentOrder.status, label = currentOrder.statusLabel)
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = BrandPalette.BorderGray)
                            Spacer(modifier = Modifier.height(12.dp))

                            if (vehicle != null) {
                                Text(
                                    text = "Veículo: ${vehicle.displayName} (${vehicle.color ?: ""})",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.TextDark
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                            }

                            if (currentOrder.entryKm != null && currentOrder.entryKm > 0) {
                                Text(
                                    text = "Quilometragem de entrada: ${currentOrder.entryKm} km",
                                    style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                )
                            }
                        }
                    }
                }

                // Complaint (Queixa)
                if (!currentOrder.complaint.isNullOrEmpty()) {
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.ChatBubbleOutline,
                                        contentDescription = null,
                                        tint = BrandPalette.SparkBlue,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Queixa Inicial",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "\"${currentOrder.complaint}\"",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                        color = Color.DarkGray
                                    )
                                )
                            }
                        }
                    }
                }

                // Client notes If exist
                if (!currentOrder.customerVisibleNotes.isNullOrEmpty()) {
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.SpeakerNotes,
                                        contentDescription = null,
                                        tint = BrandPalette.SparkBlue,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Mensagem do Técnico",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = currentOrder.customerVisibleNotes ?: "",
                                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.DarkGray)
                                )
                            }
                        }
                    }
                }

                // Items list (Serviços / Peças)
                val itemsList = currentOrder.items?.filter { it.approved == true } ?: emptyList()
                if (itemsList.isNotEmpty()) {
                    item {
                        SectionHeader(title = "Serviços & Peças Autorizados")
                    }
                    items(itemsList) { item ->
                        AppCard {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(0.7f)) {
                                    Text(
                                        text = item.description,
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Qtd: %.1f • R$ %.2f".format(item.quantity, item.unitPrice),
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                    )
                                }
                                Text(
                                    text = "R$ %.2f".format(item.quantity * item.unitPrice),
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.DeepBlue,
                                    modifier = Modifier.weight(0.3f),
                                    textAlign = TextAlign.End
                                )
                            }
                        }
                    }
                }

                // Checklists details
                val checklists = currentOrder.checklistItems ?: emptyList()
                if (checklists.isNotEmpty()) {
                    item {
                        SectionHeader(title = "Checklist Realizado")
                    }
                    items(checklists) { item ->
                        AppCard {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(0.7f)) {
                                    Text(
                                        text = item.label,
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                        color = BrandPalette.SlateGray
                                    )
                                    if (!item.notes.isNullOrEmpty()) {
                                        Text(
                                            text = item.notes,
                                            style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                        )
                                    }
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(
                                            when (item.result.uppercase()) {
                                                "OK" -> BrandPalette.StatusSuccessBg
                                                "ATTENTION" -> BrandPalette.StatusPendingBg
                                                "DAMAGED" -> BrandPalette.StatusErrorBg
                                                else -> BrandPalette.StatusGreyBg
                                            }
                                        )
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = when (item.result.uppercase()) {
                                            "OK" -> "Regular"
                                            "ATTENTION" -> "Atenção"
                                            "DAMAGED" -> "Avariado"
                                            else -> "N/A"
                                        },
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = when (item.result.uppercase()) {
                                                "OK" -> BrandPalette.StatusSuccessText
                                                "ATTENTION" -> BrandPalette.StatusPendingText
                                                "DAMAGED" -> BrandPalette.StatusErrorText
                                                else -> BrandPalette.StatusGreyText
                                            }
                                        )
                                    )
                                }
                            }
                        }
                    }
                }

                // Timeline Logs
                val timeline = currentOrder.timeline ?: emptyList()
                if (timeline.isNotEmpty()) {
                    item {
                        SectionHeader(title = "Linha do Tempo do Serviço")
                    }
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                timeline.forEachIndexed { index, hist ->
                                    TimelineItemView(
                                        history = hist,
                                        isLast = index == timeline.lastIndex
                                    )
                                }
                            }
                        }
                    }
                }

                // Fotos na aba dedicada

                // Action associated quote
                val localQuoteId = dashboard?.quotes?.find { it.serviceOrder?.id == orderId }?.id
                if (localQuoteId != null) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        AppButton(
                            text = "Responder Orçamento Desta OS",
                            onClick = { onNavigateToQuote(localQuoteId) },
                            icon = Icons.Default.ReceiptLong,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
            }
        }
    }
}


// ==========================================
// 4. BUDGET SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BudgetScreen(
    quoteId: String,
    viewModel: PortalViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val quote by viewModel.currentQuote.collectAsState()
    val dashboard by viewModel.dashboard.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()

    // Dialogs States
    var showApproveDialog by remember { mutableStateOf(false) }
    var showRejectDialog by remember { mutableStateOf(false) }

    // Approve selective lines states
    val lineApprovals = remember { mutableStateMapOf<String, Boolean>() }

    LaunchedEffect(quoteId) {
        viewModel.loadQuoteDetails(quoteId)
    }

    // Auto-populate selective lines approvals map
    LaunchedEffect(quote) {
        quote?.lines?.forEach { line ->
            // Initialize: if already responded, keep it. Otherwise default to approved (true)
            if (lineApprovals[line.id] == null) {
                lineApprovals[line.id] = line.approved ?: true
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Orçamento #${quote?.number ?: ""}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F3D4C),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
        ) {
            OfflineBanner(isOffline = isOffline)

            if (isLoading && quote == null) {
                LoadingScreen()
                return@Scaffold
            }

            val currentQuote = quote
            if (currentQuote == null) {
                ErrorState(
                    message = "Não foi possível carregar as informações deste orçamento.",
                    onRetry = { viewModel.loadQuoteDetails(quoteId) }
                )
                return@Scaffold
            }

            val isPending = currentQuote.status.uppercase() == "PENDING"
            var selectedTab by remember { mutableIntStateOf(0) }
            val photos = currentQuote.photos?.map { it.url } ?: emptyList()
            val org = dashboard?.organization

            Column(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F3D4C))
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PortalBrandLogo(
                            modifier = Modifier.height(40.dp),
                            logoUrl = org?.logoUrl,
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(text = org?.name ?: "Orçamento", color = Color.White, fontWeight = FontWeight.Bold)
                            Text(
                                text = "Orçamento #${currentQuote.number ?: "—"}",
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                DetailTabRow(
                    tabs = listOf("Orçamento", "Fotos"),
                    selectedIndex = selectedTab,
                    onTabSelected = { selectedTab = it },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    badgeCounts = listOf(0, photos.size),
                )

                if (selectedTab == 1) {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp)
                    ) {
                        PhotoGalleryGrid(photos = photos)
                    }
                } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 16.dp)
                ) {
                    // Summary budget Header Card
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "Orçamento #${currentQuote.number ?: "—"}",
                                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                            color = BrandPalette.SlateGray
                                        )
                                        currentQuote.serviceOrder?.let {
                                            Text(
                                                text = "Ordem de Serviço #${it.number}",
                                                style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                            )
                                        }
                                    }
                                    val statusText = when (currentQuote.status.uppercase()) {
                                        "PENDING" -> "Pendente"
                                        "APPROVED" -> "Aprovado"
                                        "REJECTED" -> "Recusado"
                                        else -> currentQuote.status
                                    }
                                    StatusBadge(status = currentQuote.status, label = statusText)
                                }

                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "Valor Total do Orçamento:",
                                    style = MaterialTheme.typography.labelMedium.copy(color = Color.Gray)
                                )
                                Text(
                                    text = "R$ %.2f".format(currentQuote.amount),
                                    style = MaterialTheme.typography.headlineMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        color = BrandPalette.DeepBlue
                                    )
                                )
                            }
                        }
                    }

                    if (isPending) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFFFEF3C7))
                                    .border(1.dp, Color(0xFFFCD34D), RoundedCornerShape(12.dp))
                                    .padding(14.dp)
                            ) {
                                Row {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            text = "Aprovação Parcial Disponível",
                                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                            color = Color(0xFF92400E)
                                        )
                                        Text(
                                            text = "Selecione apenas os itens que deseja aprovar na lista abaixo antes de confirmar.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color(0xFFB45309)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Lines List Header
                    item {
                        SectionHeader(title = "Itens do Orçamento")
                    }

                    // Budget lines
                    items(currentQuote.lines) { line ->
                        AppCard {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (isPending) {
                                    Checkbox(
                                        checked = lineApprovals[line.id] ?: true,
                                        onCheckedChange = { isChecked ->
                                            lineApprovals[line.id] = isChecked
                                        }
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = line.description,
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(
                                                    if (line.lineType.uppercase() == "SERVICE") Color(0xFFEFF6FF) else Color(0xFFF0FDF4)
                                                )
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (line.lineType.uppercase() == "SERVICE") "SERVIÇO" else "PEÇA",
                                                color = if (line.lineType.uppercase() == "SERVICE") Color(0xFF1D4ED8) else Color(0xFF15803D),
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Qtd: %.1f • R$ %.2f".format(line.quantity, line.unitPrice),
                                            style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                        )
                                    }
                                }

                                Text(
                                    text = "R$ %.2f".format(line.quantity * line.unitPrice),
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray,
                                    modifier = Modifier.padding(start = 8.dp)
                                )
                            }
                        }
                    }
                }
                }

                if (isPending) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(BrandPalette.CardBg)
                            .padding(16.dp)
                    ) {
                        Divider(color = BrandPalette.BorderGray, thickness = 1.dp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { showRejectDialog = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandPalette.StatusErrorBg,
                                    contentColor = BrandPalette.StatusErrorText
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                            ) {
                                Icon(imageVector = Icons.Default.Close, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Recusar", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { showApproveDialog = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF10B981), // Green
                                    contentColor = Color.White
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                            ) {
                                Icon(imageVector = Icons.Default.Check, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Aprovar", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // DIALOGS: APPROVAL & REFUSAL
    // ==========================================
    var customComment by remember { mutableStateOf("") }

    if (showApproveDialog) {
        AlertDialog(
            onDismissRequest = { showApproveDialog = false },
            title = { Text("Confirmar Aprovação") },
            text = {
                Column {
                    val approvedCount = lineApprovals.values.count { it }
                    val totalLines = lineApprovals.size
                    Text(
                        text = "Você está prestes a aprovar $approvedCount de $totalLines itens deste orçamento. Tem certeza?",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    InputField(
                        value = customComment,
                        onValueChange = { customComment = it },
                        label = "Observação opcional",
                        placeholder = "Escreva aqui alguma mensagem para a oficina se desejar..."
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showApproveDialog = false
                        viewModel.approveQuote(
                            quoteId = quoteId,
                            lineIdsAndApprovals = lineApprovals.toList(),
                            comment = customComment.ifEmpty { null }
                        ) { success ->
                            if (success) {
                                onBack()
                            }
                        }
                    }
                ) {
                    Text("Sim, Autorizar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showApproveDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = { Text("Recusar Orçamento") },
            text = {
                Column {
                    Text(
                        text = "A oficina será notificada de que você recusou este orçamento. Informe-nos o motivo se desejar:",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    InputField(
                        value = customComment,
                        onValueChange = { customComment = it },
                        label = "Motivo da recusa (opcional)",
                        placeholder = "Ex. Orçamento acima do esperado, prefiro fazer outra hora..."
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRejectDialog = false
                        viewModel.rejectQuote(
                            quoteId = quoteId,
                            comment = customComment.ifEmpty { null }
                        ) { success ->
                            if (success) {
                                onBack()
                            }
                        }
                    }
                ) {
                    Text("Confirmar Recusa", fontWeight = FontWeight.Bold, color = BrandPalette.StatusErrorText)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = false }) {
                    Text("Voltar")
                }
            }
        )
    }
}


// ==========================================
// 6. SUPPORT SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(
    viewModel: PortalViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val dashboard by viewModel.dashboard.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fale Conosco") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandPalette.DeepBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val org = dashboard?.organization
            if (org == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    EmptyState(message = "Informações do suporte indisponíveis no momento.")
                }
                return@Scaffold
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Organization Brand Avatar Bubble
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(BrandPalette.DeepBlue),
                contentAlignment = Alignment.Center
            ) {
                PortalBrandLogo(modifier = Modifier.fillMaxSize(0.85f))
            }

            Spacer(modifier = Modifier.height(16.dp))
            SectionHeader(
                title = org.name,
                subtitle = "Sua oficina mecânica de confiança",
                modifier = Modifier.padding(horizontal = 24.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Phone Contact Card
                if (!org.phone.isNullOrEmpty()) {
                    AppCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { launchDialer(context, org.phone) }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.PhoneInTalk,
                                contentDescription = null,
                                tint = BrandPalette.DeepBlue,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "Telefone da Oficina",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                                Text(text = org.phone, color = Color.Gray)
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            Icon(
                                imageVector = Icons.Default.Call,
                                contentDescription = null,
                                tint = BrandPalette.SparkBlue
                            )
                        }
                    }

                    // Whatsapp chat Card
                    AppCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    launchWhatsApp(
                                        context,
                                        org.phone,
                                        "Olá! Acompanho meu veículo pelo aplicativo e gostaria de tirar uma dúvida."
                                    )
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Chat,
                                contentDescription = null,
                                tint = Color(0xFF25D366),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "Chamar no WhatsApp",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                                Text(text = "Fale direto com nosso suporte", color = Color.Gray)
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            Icon(
                                imageVector = Icons.Default.ArrowForwardIos,
                                contentDescription = null,
                                tint = Color.LightGray,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }

                // Email Contact Card
                if (!org.email.isNullOrEmpty()) {
                    AppCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Email,
                                contentDescription = null,
                                tint = BrandPalette.DeepBlue,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "E-mail de Contato",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                                Text(text = org.email, color = Color.Gray)
                            }
                        }
                    }
                }

                // Address Location Card
                if (!org.address.isNullOrEmpty()) {
                    AppCard {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { launchGoogleMaps(context, org.address) }
                                .padding(16.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.PinDrop,
                                    contentDescription = null,
                                    tint = BrandPalette.SparkBlue,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Text(
                                    text = "Endereço",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = org.address,
                                color = Color.DarkGray,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.End,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Ver Rota no Maps",
                                    color = BrandPalette.SparkBlue,
                                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    imageVector = Icons.Default.Map,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = BrandPalette.SparkBlue
                                )
                            }
                        }
                    }
                }

                // Business details Card
                AppCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "Horários de Atendimento",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = BrandPalette.SlateGray
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Segunda a Sexta-feira: 08:30 às 18:00\nSábados: 08:30 às 12:00",
                            style = MaterialTheme.typography.bodyMedium.copy(color = Color.DarkGray),
                            lineHeight = 20.sp
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}


// ==========================================
// 8. NOTIFICATIONS SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: PortalViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
    onNavigateToQuoteDetails: (String) -> Unit,
    pushPermissionGranted: Boolean = true,
    onRequestPushPermission: () -> Unit = {},
) {
    val notifications by viewModel.notifications.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notificações") },
                actions = {
                    val hasUnread = notifications.any { !it.read }
                    if (hasUnread) {
                        TextButton(
                            onClick = { viewModel.markAllNotificationsAsRead() },
                            colors = ButtonDefaults.textButtonColors(contentColor = Color.White)
                        ) {
                            Text("Ler Todas", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandPalette.DeepBlue,
                    titleContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
        ) {
            OfflineBanner(isOffline = isOffline)

            if (!pushPermissionGranted) {
                AppCard(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Ative as notificações",
                            fontWeight = FontWeight.Bold,
                            color = BrandPalette.SlateGray
                        )
                        Text(
                            text = "Receba avisos quando sua OS ou orçamento for atualizado.",
                            fontSize = 13.sp,
                            color = BrandPalette.TextSecondary,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                        AppButton(
                            text = "Permitir notificações",
                            onClick = onRequestPushPermission,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            if (isLoading && notifications.isEmpty()) {
                LoadingScreen()
                return@Scaffold
            }

            if (notifications.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    EmptyState(
                        message = "Sua caixa de mensagens está vazia.",
                        icon = Icons.Default.NotificationsNone
                    )
                }
                return@Scaffold
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                items(notifications) { notif ->
                    AppCard(
                        backgroundColor = if (notif.read) BrandPalette.CardBg else Color(0xFFF0F7FF)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .clickable {
                                    if (!notif.read) {
                                        viewModel.markNotificationAsRead(notif.id)
                                    }
                                    // Deep link triggers
                                    if (notif.quoteId != null) {
                                        onNavigateToQuoteDetails(notif.quoteId)
                                    } else if (notif.serviceOrderId != null) {
                                        onNavigateToOrderDetails(notif.serviceOrderId)
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(
                                                if (notif.read) Color.Transparent else BrandPalette.SparkBlue
                                            )
                                    )
                                    Spacer(modifier = Modifier.width(if (notif.read) 0.dp else 8.dp))
                                    Text(
                                        text = when (notif.type.uppercase()) {
                                            "ORCAMENTO" -> "💳 Orçamento"
                                            "STATUS" -> "⚙️ Status"
                                            "FINALIZACAO" -> "🏁 Concluído"
                                            "ANEXO" -> "📸 Foto"
                                            else -> "🔔 Mensagem"
                                        },
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            color = Color.Gray,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                                Text(
                                    text = PortalDateTime.formatDateTime(notif.createdAt),
                                    style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = notif.title,
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = if (notif.read) FontWeight.Bold else FontWeight.Black
                                ),
                                color = BrandPalette.SlateGray
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = notif.body,
                                style = MaterialTheme.typography.bodyMedium.copy(color = Color.DarkGray)
                            )

                            if (notif.quoteId != null || notif.serviceOrderId != null) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "Toque para abrir os detalhes",
                                        color = BrandPalette.SparkBlue,
                                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(
                                        imageVector = Icons.Default.ArrowRightAlt,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp),
                                        tint = BrandPalette.SparkBlue
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
