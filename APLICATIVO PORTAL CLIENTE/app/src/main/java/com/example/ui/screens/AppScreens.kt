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

// --- MASKS ---
fun formatCpfOnChange(input: String): String {
    val digits = input.filter { it.isDigit() }
    val sb = StringBuilder()
    for (i in digits.indices) {
        if (i == 3 || i == 6) sb.append(".")
        if (i == 9) sb.append("-")
        sb.append(digits[i])
        if (sb.length >= 14) break
    }
    return sb.toString()
}

fun formatPlateOnChange(input: String): String {
    val clean = input.replace("[^a-zA-Z0-9]".toRegex(), "").uppercase()
    val sb = StringBuilder()
    for (i in clean.indices) {
        if (i == 3) sb.append("-")
        sb.append(clean[i])
        if (sb.length >= 8) break
    }
    return sb.toString()
}


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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0C1938)) // Premium Deep Night Blue
    ) {
        // Decorative background layers
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.45f)
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
                        colors = listOf(Color(0xFF1E3A8A), Color(0xFF0C1938))
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Header Branding Icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Build,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Portal do Cliente",
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.Black,
                    letterSpacing = (-1).sp
                )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Acompanhe o serviço do seu veículo em tempo real",
                color = Color.White.copy(alpha = 0.7f),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(36.dp))

            // Login card
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
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
                        onValueChange = { cpf = formatCpfOnChange(it) },
                        label = "CPF",
                        placeholder = "000.000.000-00",
                        leadingIcon = Icons.Default.Person,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        testTag = "login_cpf_input"
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    InputField(
                        value = plate,
                        onValueChange = { plate = formatPlateOnChange(it) },
                        label = "Placa do Veículo",
                        placeholder = "ABC-1D23",
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
                        text = if (isLoading) "Autenticando..." else "Acessar Meu Portal",
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
    onToggleTheme: () -> Unit = {},
    themeMode: ThemeMode = ThemeMode.SYSTEM,
) {
    val context = LocalContext.current
    val dashboard by viewModel.dashboard.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

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
                title = { Text("") },
                actions = {
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
        ) {
            OfflineBanner(isOffline = isOffline)

            if (isLoading && dashboard == null) {
                LoadingScreen()
                return@Scaffold
            }

            val currentData = dashboard
            if (currentData == null) {
                ErrorState(
                    message = "Não foi possível carregar as informações do seu portal.",
                    onRetry = { viewModel.loadAllData() }
                )
                return@Scaffold
            }

            val clientName = currentData.customer.name.substringBefore(" ")
            val companyName = currentData.organization.name

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                // Header Welcome
                item {
                    Column {
                        Text(
                            text = "Olá, $clientName!",
                            style = MaterialTheme.typography.bodyLarge.copy(
                                color = Color.Gray,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                        SectionHeader(
                            title = companyName,
                            subtitle = currentData.organization.portalWelcome ?: "Seu veículo bem cuidado sempre."
                        )
                    }
                }

                // Active Vehicle
                item {
                    Text(
                        text = "MEU VEÍCULO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.Gray,
                            letterSpacing = 1.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    VehicleCard(vehicle = currentData.vehicle)
                }

                // Active Service Order (In progress)
                item {
                    Text(
                        text = "SERVIÇO EM ANDAMENTO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.Gray,
                            letterSpacing = 1.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    val activeOs = currentData.serviceOrders.find { os ->
                        os.status.uppercase() != "FINISHED" &&
                        os.status.uppercase() != "DELIVERED" &&
                        os.status.uppercase() != "CANCELLED"
                    }

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

                // Budgets Section (Quotes pending)
                val pendingQuote = currentData.quotes.find { it.status.uppercase() == "PENDING" }
                if (pendingQuote != null) {
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
                            quote = pendingQuote,
                            onClick = { onNavigateToQuoteDetails(pendingQuote.id) }
                        )
                    }
                }

                // Navigation Shortcuts Grid
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onNavigateToHistory() }
                                .border(1.dp, BrandPalette.BorderGray, RoundedCornerShape(12.dp))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Assignment,
                                    contentDescription = null,
                                    tint = BrandPalette.SparkBlue,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Minhas OS",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                            }
                        }

                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onNavigateToSupport() }
                                .border(1.dp, BrandPalette.BorderGray, RoundedCornerShape(12.dp))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ContactSupport,
                                    contentDescription = null,
                                    tint = BrandPalette.SparkBlue,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Suporte",
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                    color = BrandPalette.SlateGray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}


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
                                        text = "Abertura: ${currentOrder.createdAt.substringBefore("T")}",
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
                                    text = "Veículo: ${vehicle.brand} ${vehicle.model} (${vehicle.color})",
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
                                            "DAMAGED" -> "A Variado"
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

                // Attachments / Photos Gallery
                val photos = currentOrder.photos ?: emptyList()
                if (photos.isNotEmpty()) {
                    item {
                        SectionHeader(title = "Galeria de Fotos")
                    }
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(12.dp)) {
                                photos.forEach { url ->
                                    AsyncImage(
                                        model = url,
                                        contentDescription = "Foto do serviço",
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(200.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color.LightGray)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                }
                            }
                        }
                    }
                }

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

            Column(modifier = Modifier.fillMaxSize()) {
                // Main content
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
                                            text = "Orçamento #${currentQuote.number}",
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

                // Bottom response triggers (visible only if PENDING)
                if (isPending) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
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
// 5. SERVICE HISTORY SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServiceHistoryScreen(
    viewModel: PortalViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
    onBack: () -> Unit
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Histórico de Serviços") },
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

            if (isLoading && dashboard == null) {
                LoadingScreen()
                return@Scaffold
            }

            val serviceHistories = dashboard?.serviceOrders?.filter {
                val s = it.status.uppercase()
                s == "FINISHED" || s == "DELIVERED" || s == "CANCELLED" || s == "ENTREGUE" || s == "FINALIZADA" || s == "CANCELADA"
            } ?: emptyList()

            if (serviceHistories.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    EmptyState(
                        message = "Você ainda não possui serviços finalizados ou históricos salvos.",
                        icon = Icons.Default.FolderOpen
                    )
                }
                return@Scaffold
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                items(serviceHistories) { item ->
                    AppCard(
                        modifier = Modifier.clickable { onNavigateToOrderDetails(item.id) }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.TaskAlt,
                                        contentDescription = null,
                                        tint = BrandPalette.StatusSuccessText,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "OS #${item.number}",
                                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                        color = BrandPalette.SlateGray
                                    )
                                }
                                StatusBadge(status = item.status, label = item.statusLabel)
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Divider(color = BrandPalette.BorderGray)
                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = "Finalizado em: ${item.updatedAt.substringBefore("T")}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Gray
                            )

                            if (item.totalAmount != null && item.totalAmount > 0) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Valor Total: R$ %.2f".format(item.totalAmount),
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Black,
                                        color = BrandPalette.DeepBlue
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
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
                if (!org.logoUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = org.logoUrl,
                        contentDescription = "Logo",
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.HomeRepairService,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                }
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
// 7. PROFILE SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: PortalViewModel,
    onLogout: () -> Unit
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val vehicles by viewModel.vehicles.collectAsState()
    var showVehicleSwitcherBySheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Meu Perfil") },
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
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val user = dashboard?.customer
            if (user == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    EmptyState(message = "Informações do perfil carregando...")
                }
                return@Scaffold
            }

            Spacer(modifier = Modifier.height(24.dp))

            // User Initials bubble
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(
                        androidx.compose.ui.graphics.Brush.radialGradient(
                            colors = listOf(BrandPalette.SparkBlue, BrandPalette.DeepBlue)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                val words = user.name.split(" ")
                val initials = if (words.size >= 2) {
                    "${words[0].first()}${words[1].first()}".uppercase()
                } else {
                    words[0].take(2).uppercase()
                }
                Text(
                    text = initials,
                    color = Color.White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = user.name,
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                color = BrandPalette.SlateGray
            )

            Spacer(modifier = Modifier.height(24.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Personal data Card
                AppCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "DADOS CADASTRAIS",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray,
                                letterSpacing = 1.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "CPF do Titular",
                            style = MaterialTheme.typography.labelMedium.copy(color = Color.Gray)
                        )
                        val document = user.document ?: ""
                        val maskedCpf = if (document.length == 11) {
                            "***.${document.substring(3, 6)}.${document.substring(6, 9)}-**"
                        } else document
                        Text(
                            text = maskedCpf,
                            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                            color = BrandPalette.SlateGray
                        )

                        if (!user.phone.isNullOrEmpty()) {
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Telefone celular",
                                style = MaterialTheme.typography.labelMedium.copy(color = Color.Gray)
                            )
                            Text(
                                text = user.phone,
                                style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = BrandPalette.SlateGray
                            )
                        }
                    }
                }

                // Active Vehicle switcher shortcut
                AppCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "VEÍCULO ATIVO NA SESSÃO",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray,
                                letterSpacing = 1.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        dashboard?.vehicle?.let { activeVeh ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "${activeVeh.brand} ${activeVeh.model}",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                                    )
                                    Text(
                                        text = "Placa: ${activeVeh.plate.uppercase()}",
                                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                                    )
                                }
                                LicensePlateView(plate = activeVeh.plate)
                            }
                        }

                        // Vehicle switch button list
                        if (vehicles.size > 1) {
                            Spacer(modifier = Modifier.height(14.dp))
                            Button(
                                onClick = { showVehicleSwitcherBySheet = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = BrandPalette.SparkBlue.copy(alpha = 0.12f),
                                    contentColor = BrandPalette.SparkBlue
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(imageVector = Icons.Default.Sync, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Alternar Veículo (${vehicles.size})", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Logout button
                Button(
                    onClick = {
                        viewModel.logout { onLogout() }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandPalette.StatusErrorBg,
                        contentColor = BrandPalette.StatusErrorText
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                ) {
                    Icon(imageVector = Icons.Default.ExitToApp, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sair da Sessão",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                    )
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // Dynamic vehicle list Switch drawer/popup
    if (showVehicleSwitcherBySheet) {
        AlertDialog(
            onDismissRequest = { showVehicleSwitcherBySheet = false },
            title = { Text("Selecione o Veículo") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    vehicles.forEach { veh ->
                        val isActive = veh.id == dashboard?.vehicle?.id
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (isActive) BrandPalette.SparkBlue.copy(alpha = 0.1f) else Color.Transparent
                                )
                                .border(
                                    1.dp,
                                    if (isActive) BrandPalette.SparkBlue else BrandPalette.BorderGray,
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable {
                                    showVehicleSwitcherBySheet = false
                                    viewModel.switchVehicle(veh.id) {
                                        // Auto reloads
                                    }
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${veh.brand} ${veh.model}",
                                    fontWeight = FontWeight.Bold,
                                    color = if (isActive) BrandPalette.DeepBlue else BrandPalette.SlateGray
                                )
                                Text(text = veh.plate.uppercase(), color = Color.Gray, fontSize = 12.sp)
                            }
                            if (isActive) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = BrandPalette.SparkBlue
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showVehicleSwitcherBySheet = false }) {
                    Text("Fechar")
                }
            }
        )
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
    onNavigateToQuoteDetails: (String) -> Unit
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
                        backgroundColor = if (notif.read) Color.White else Color(0xFFF0F7FF) // Unread pale blue gradient highlight matches PWA
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
                                    text = notif.createdAt.substringBefore("T") + " " + notif.createdAt.substringAfter("T").substring(0, 5),
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
