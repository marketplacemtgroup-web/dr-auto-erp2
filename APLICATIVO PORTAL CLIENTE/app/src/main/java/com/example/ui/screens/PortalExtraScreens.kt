package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.Screen
import com.example.lib.PortalDateTime
import com.example.lib.PortalStatus
import com.example.lib.QuoteLineHelper
import com.example.types.*
import com.example.ui.components.*
import com.example.ui.theme.ThemeMode
import com.example.viewmodels.PortalViewModel
import kotlinx.coroutines.delay

private val splashMessages = listOf(
    "Carregando...",
    "Conectando ao sistema...",
    "Iniciando acompanhamento em tempo real...",
)

@Composable
fun SplashScreen(viewModel: PortalViewModel) {
    var msgIndex by remember { mutableIntStateOf(0) }
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            msgIndex = (msgIndex + 1).coerceAtMost(splashMessages.lastIndex)
        }
    }

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) viewModel.loadAllData(showLoading = false)
    }

    PortalBackground {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            PortalBrandLogo(modifier = Modifier.height(80.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Portal do Cliente",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                color = BrandPalette.SlateGray
            )
            Spacer(modifier = Modifier.height(24.dp))
            CircularProgressIndicator(color = BrandPalette.SparkBlue)
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = splashMessages[msgIndex], color = Color(0xFF64748B), fontSize = 14.sp)
        }
    }
}

@Composable
fun AccessLinkScreen(
    token: String,
    viewModel: PortalViewModel,
    onSuccess: () -> Unit,
    onGoToLogin: () -> Unit,
) {
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    var started by remember(token) { mutableStateOf(false) }

    LaunchedEffect(token) {
        if (!started) {
            started = true
            viewModel.clearError()
            viewModel.loginByAccessToken(
                token = token,
                onSuccess = onSuccess,
                onError = { /* handled via errorMessage */ }
            )
        }
    }

    PortalBackground {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            if (errorMessage != null) {
                AppCard(modifier = Modifier.padding(24.dp)) {
                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = errorMessage ?: "", color = BrandPalette.StatusErrorText, textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(16.dp))
                        TextButton(onClick = onGoToLogin) {
                            Text("Entrar com CPF e placa", color = BrandPalette.SparkBlue)
                        }
                    }
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(color = BrandPalette.SparkBlue, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (isLoading) "Abrindo portal..." else "Conectando...", color = Color(0xFF64748B))
                }
            }
        }
    }
}

enum class OrdersFilter { ALL, IN_PROGRESS, FINISHED }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    viewModel: PortalViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var filter by remember { mutableStateOf(OrdersFilter.ALL) }

    val orders = remember(dashboard, filter) {
        val all = dashboard?.serviceOrders ?: emptyList()
        when (filter) {
            OrdersFilter.ALL -> all
            OrdersFilter.IN_PROGRESS -> all.filter { PortalStatus.isInProgress(it.status) }
            OrdersFilter.FINISHED -> all.filter { PortalStatus.isFinished(it.status) }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Minhas OS") },
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

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(BrandPalette.CardBg)
                    .border(1.dp, BrandPalette.BorderGray, RoundedCornerShape(12.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                listOf(
                    OrdersFilter.ALL to "Todas",
                    OrdersFilter.IN_PROGRESS to "Em andamento",
                    OrdersFilter.FINISHED to "Finalizadas",
                ).forEach { (tab, label) ->
                    val selected = filter == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selected) BrandPalette.DeepBlue else Color.Transparent)
                            .clickable { filter = tab }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (selected) Color.White else Color.Gray
                        )
                    }
                }
            }

            if (isLoading && dashboard == null) {
                LoadingScreen()
                return@Column
            }

            if (orders.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    EmptyState(
                        message = "Nenhum registro encontrado nesta categoria.",
                        icon = Icons.Default.Assignment
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(orders) { order ->
                        OrderCard(
                            order = order,
                            vehicle = dashboard?.vehicle,
                            onClick = { onNavigateToOrderDetails(order.id) }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileHubScreen(
    viewModel: PortalViewModel,
    onNavigate: (Screen) -> Unit,
    onLogout: () -> Unit,
    onToggleTheme: () -> Unit,
    themeMode: ThemeMode,
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val sessionName = viewModel.getCustomerName()
    val customerName = dashboard?.customer?.name ?: sessionName.ifEmpty { "Cliente" }
    val orgName = dashboard?.organization?.name ?: viewModel.getOrganizationName()
    val orgAddress = dashboard?.organization?.address ?: "Endereço não informado"

    val menuItems = listOf(
        Triple("Meus Dados", Icons.Default.Person, Screen.ProfileData),
        Triple("Meus Veículos", Icons.Default.DirectionsCar, Screen.ProfileVehicles),
        Triple("Histórico de Serviços", Icons.Default.History, Screen.ProfileHistory),
        Triple("Suporte Técnico", Icons.Default.ContactSupport, Screen.ProfileSupport),
        Triple("Políticas de Privacidade", Icons.Default.Shield, Screen.ProfilePrivacy),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Perfil / Suporte") },
                actions = {
                    IconButton(onClick = onToggleTheme) {
                        Icon(
                            imageVector = if (themeMode == ThemeMode.DARK) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Alternar tema",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandPalette.DeepBlue,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(BrandPalette.MetallicSilver)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            AppCard {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(32.dp))
                            .background(BrandPalette.SparkBlue.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = BrandPalette.SparkBlue, modifier = Modifier.size(32.dp))
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(text = customerName, fontWeight = FontWeight.Black, fontSize = 18.sp, color = BrandPalette.SlateGray)
                        Text(text = "CPF: ***.***.***-**", fontSize = 13.sp, color = Color.Gray)
                        Text(
                            text = dashboard?.customer?.phone ?: dashboard?.customer?.whatsapp ?: "—",
                            fontSize = 13.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            AppCard(modifier = Modifier.clickable { onNavigate(Screen.ProfileSupport) }) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "OFICINA VINCULADA", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandPalette.SparkBlue)
                    Text(text = orgName, fontWeight = FontWeight.Bold, color = BrandPalette.SlateGray)
                    Text(text = orgAddress, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(top = 4.dp))
                }
            }

            Text(text = "OPÇÕES", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray, modifier = Modifier.padding(start = 4.dp, top = 4.dp))

            menuItems.forEach { (label, icon, screen) ->
                AppCard(modifier = Modifier.clickable { onNavigate(screen) }) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(icon, contentDescription = null, tint = BrandPalette.SparkBlue)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = label, modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium, color = BrandPalette.SlateGray)
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(20.dp))
                    }
                }
            }

            TextButton(
                onClick = { viewModel.logout(onLogout) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.ExitToApp, contentDescription = null, tint = BrandPalette.StatusErrorText)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sair", color = BrandPalette.StatusErrorText, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileDataScreen(viewModel: PortalViewModel, onBack: () -> Unit) {
    val dashboard by viewModel.dashboard.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Meus Dados") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Voltar") }
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
            modifier = Modifier.fillMaxSize().padding(innerPadding).background(BrandPalette.MetallicSilver).padding(16.dp)
        ) {
            val rows = listOf(
                "Nome" to (dashboard?.customer?.name ?: viewModel.getCustomerName()),
                "Telefone" to (dashboard?.customer?.phone ?: "—"),
                "WhatsApp" to (dashboard?.customer?.whatsapp ?: "—"),
                "Placa atual" to (viewModel.getPlate().ifEmpty { dashboard?.vehicle?.plate ?: "—" }),
                "Veículo" to listOfNotNull(dashboard?.vehicle?.brand, dashboard?.vehicle?.model).joinToString(" ").ifEmpty { "—" },
            )
            AppCard {
                Column {
                    rows.forEachIndexed { index, (label, value) ->
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(text = label, fontSize = 12.sp, color = Color.Gray)
                            Text(text = value, fontWeight = FontWeight.SemiBold, color = BrandPalette.SlateGray)
                        }
                        if (index < rows.lastIndex) HorizontalDivider(color = BrandPalette.BorderGray)
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Para alterar seus dados cadastrais, entre em contato com a oficina.",
                fontSize = 12.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileVehiclesScreen(viewModel: PortalViewModel, onBack: () -> Unit) {
    val dashboard by viewModel.dashboard.collectAsState()
    val vehicles by viewModel.vehicles.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val currentId = dashboard?.vehicle?.id

    LaunchedEffect(Unit) { viewModel.loadAllData(showLoading = vehicles.isEmpty()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Meus Veículos") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Voltar") }
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
            modifier = Modifier.fillMaxSize().padding(innerPadding).background(BrandPalette.MetallicSilver).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (isLoading && vehicles.isEmpty()) {
                LoadingScreen()
            } else if (vehicles.isEmpty()) {
                EmptyState(message = "Nenhum veículo cadastrado.", icon = Icons.Default.DirectionsCar)
            } else {
                vehicles.forEach { veh ->
                    val active = veh.id == currentId
                    AppCard(
                        modifier = Modifier.clickable {
                            if (!active) viewModel.switchVehicle(veh.id) {}
                        }
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(text = veh.displayName, fontWeight = FontWeight.Bold, color = BrandPalette.SlateGray)
                                if (veh.year != null) Text(text = "Ano ${veh.displayYear}", fontSize = 12.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                LicensePlateView(plate = veh.plate)
                            }
                            if (active) Icon(Icons.Default.Check, contentDescription = null, tint = BrandPalette.StatusSuccessText)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileHistoryScreen(
    viewModel: PortalViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
    onBack: () -> Unit,
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val history = remember(dashboard) {
        dashboard?.serviceOrders?.filter { PortalStatus.isFinished(it.status) } ?: emptyList()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Histórico de Serviços") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Voltar") }
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
            modifier = Modifier.fillMaxSize().padding(innerPadding).background(BrandPalette.MetallicSilver).padding(16.dp)
        ) {
            if (history.isEmpty()) {
                EmptyState(message = "Serviços finalizados aparecerão aqui.", icon = Icons.Default.History)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(history) { order ->
                        OrderCard(order = order, vehicle = dashboard?.vehicle, onClick = { onNavigateToOrderDetails(order.id) })
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfilePrivacyScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Políticas de Privacidade") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Voltar") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BrandPalette.DeepBlue,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        AppCard(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                val paragraphs = listOf(
                    "O portal do cliente utiliza seus dados (CPF e placa do veículo) apenas para autenticação e exibição das ordens de serviço vinculadas ao seu cadastro na oficina.",
                    "Não compartilhamos suas informações com terceiros, exceto quando necessário para a prestação do serviço automotivo contratado com a oficina.",
                    "As fotos, vídeos e documentos exibidos no portal são liberados pela oficina e ficam disponíveis somente para o titular do veículo autenticado.",
                    "Para solicitar exclusão de dados ou esclarecimentos, entre em contato diretamente com a oficina vinculada ao seu cadastro.",
                )
                paragraphs.forEach { Text(text = it, color = Color.DarkGray, lineHeight = 22.sp, fontSize = 14.sp) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicQuoteScreen(
    token: String,
    viewModel: PortalViewModel,
    onBack: () -> Unit,
) {
    val publicQuote by viewModel.publicQuote.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val lineApprovals = remember { mutableStateMapOf<String, Boolean>() }
    var showApproveDialog by remember { mutableStateOf(false) }
    var showRejectDialog by remember { mutableStateOf(false) }
    var customComment by remember { mutableStateOf("") }

    LaunchedEffect(token) { viewModel.loadPublicQuote(token) }

    LaunchedEffect(publicQuote) {
        publicQuote?.quote?.lines?.forEach { line ->
            if (lineApprovals[line.id] == null) lineApprovals[line.id] = line.approved ?: true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Orçamento Público") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Voltar") }
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
            modifier = Modifier.fillMaxSize().padding(innerPadding).background(BrandPalette.MetallicSilver)
        ) {
            when {
                isLoading && publicQuote == null -> LoadingScreen()
                errorMessage != null -> ErrorState(message = errorMessage ?: "Erro", onRetry = { viewModel.loadPublicQuote(token) })
                publicQuote != null -> {
                    val data = publicQuote!!
                    val quote = data.quote
                    val isPending = quote.status.uppercase() == "PENDING"

                    LazyColumn(
                        modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 16.dp)
                    ) {
                        item {
                            AppCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(text = data.organizationName, fontWeight = FontWeight.Bold, color = BrandPalette.SlateGray)
                                    Text(text = data.customerName, color = Color.Gray, fontSize = 13.sp)
                                    Text(
                                        text = "${data.vehicle.displayName} • ${data.vehicle.plate}",
                                        color = Color.Gray,
                                        fontSize = 13.sp
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(text = "Orçamento #${quote.number ?: "—"}", fontWeight = FontWeight.Black, fontSize = 18.sp)
                                    Text(text = "R$ %.2f".format(quote.amount), fontWeight = FontWeight.Bold, color = BrandPalette.DeepBlue, fontSize = 22.sp)
                                }
                            }
                        }
                        items(quote.lines) { line ->
                            AppCard {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                    if (isPending) {
                                        Checkbox(
                                            checked = lineApprovals[line.id] ?: true,
                                            onCheckedChange = { lineApprovals[line.id] = it }
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = line.description, fontWeight = FontWeight.Bold, color = BrandPalette.SlateGray)
                                        Text(text = "R$ %.2f".format(line.quantity * line.unitPrice), color = Color.Gray, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }

                    if (isPending) {
                        Row(
                            modifier = Modifier.fillMaxWidth().background(BrandPalette.CardBg).padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { showRejectDialog = true },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandPalette.StatusErrorBg, contentColor = BrandPalette.StatusErrorText)
                            ) { Text("Recusar") }
                            Button(
                                onClick = { showApproveDialog = true },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                            ) { Text("Aprovar") }
                        }
                    }
                }
            }
        }
    }

    if (showApproveDialog) {
        AlertDialog(
            onDismissRequest = { showApproveDialog = false },
            title = { Text("Confirmar Aprovação") },
            text = {
                InputField(value = customComment, onValueChange = { customComment = it }, label = "Observação opcional", placeholder = "")
            },
            confirmButton = {
                TextButton(onClick = {
                    showApproveDialog = false
                    viewModel.approvePublicQuote(
                        token,
                        publicQuote?.quote?.lines?.let { lines ->
                            QuoteLineHelper.buildSelectionsPayload(lines, lineApprovals)
                        },
                        customComment.ifEmpty { null },
                    ) { }
                }) { Text("Autorizar", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { showApproveDialog = false }) { Text("Cancelar") } }
        )
    }

    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = { Text("Recusar Orçamento") },
            text = {
                InputField(value = customComment, onValueChange = { customComment = it }, label = "Motivo (opcional)", placeholder = "")
            },
            confirmButton = {
                TextButton(onClick = {
                    showRejectDialog = false
                    viewModel.rejectPublicQuote(token, customComment.ifEmpty { null }) { }
                }) { Text("Confirmar", color = BrandPalette.StatusErrorText) }
            },
            dismissButton = { TextButton(onClick = { showRejectDialog = false }) { Text("Voltar") } }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentScreen(
    viewModel: PortalViewModel,
    onBack: () -> Unit,
    onNavigateToAppointment: () -> Unit = {},
) {
    val appointments by viewModel.appointments.collectAsState()
    val dashboard by viewModel.dashboard.collectAsState()
    val isLoading by viewModel.appointmentActionLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    var notes by remember { mutableStateOf("") }
    var selectedDateMillis by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var selectedHour by remember { mutableIntStateOf(9) }
    var selectedMinute by remember { mutableIntStateOf(0) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadAppointments()
    }

    fun buildIso(): String {
        val localDate = java.time.Instant.ofEpochMilli(selectedDateMillis)
            .atZone(java.time.ZoneId.systemDefault())
            .toLocalDate()
        return java.time.ZonedDateTime.of(
            localDate,
            java.time.LocalTime.of(selectedHour, selectedMinute),
            java.time.ZoneId.systemDefault(),
        ).toInstant().toString()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Agendar serviço") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
            )
        },
    ) { innerPadding ->
        PortalBackground(showOverlay = true) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    Text(
                        text = "Solicite um horário na oficina. A equipe confirmará o agendamento.",
                        style = MaterialTheme.typography.bodySmall.copy(color = BrandPalette.TextSecondary),
                    )
                }

                dashboard?.maintenanceReminders?.takeIf { it.isNotEmpty() }?.let { reminders ->
                    item {
                        AppCard {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Manutenções preventivas",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                )
                                reminders.forEach { reminder ->
                                    val label = if (reminder.type == "OIL_CHANGE") "Troca de óleo" else "Revisão"
                                    val due = listOfNotNull(
                                        reminder.dueKm?.let { "$it km" },
                                        PortalDateTime.formatDate(reminder.dueDate),
                                    ).joinToString(" · ")
                                    Text(
                                        text = "$label — OS #${reminder.serviceOrderNumber}${if (due.isNotBlank()) " · $due" else ""}",
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(top = 6.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    AppCard {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Novo agendamento", fontWeight = FontWeight.Bold)
                            OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale("pt", "BR"))
                                        .format(java.util.Date(selectedDateMillis))
                                )
                            }
                            OutlinedButton(onClick = { showTimePicker = true }, modifier = Modifier.fillMaxWidth()) {
                                Text(String.format("%02d:%02d", selectedHour, selectedMinute))
                            }
                            OutlinedTextField(
                                value = notes,
                                onValueChange = { notes = it },
                                label = { Text("Observações") },
                                modifier = Modifier.fillMaxWidth(),
                                minLines = 2,
                            )
                            Button(
                                onClick = {
                                    viewModel.createAppointment(buildIso(), notes) { ok ->
                                        if (ok) {
                                            successMessage = "Agendamento solicitado! Aguarde confirmação da oficina."
                                            notes = ""
                                        }
                                    }
                                },
                                enabled = !isLoading,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(if (isLoading) "Enviando..." else "Solicitar agendamento")
                            }
                        }
                    }
                }

                if (successMessage != null) {
                    item {
                        Text(successMessage!!, color = BrandPalette.StatusSuccessText, fontSize = 13.sp)
                    }
                }
                if (errorMessage != null) {
                    item {
                        Text(errorMessage!!, color = BrandPalette.StatusErrorText, fontSize = 13.sp)
                    }
                }

                item {
                    Text(
                        "Meus agendamentos",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }

                if (appointments.isEmpty()) {
                    item {
                        Text("Nenhum agendamento recente.", color = BrandPalette.TextSecondary, fontSize = 13.sp)
                    }
                } else {
                    items(appointments, key = { it.id }) { appt ->
                        AppCard {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(PortalDateTime.formatDateTime(appt.scheduledAt), fontWeight = FontWeight.SemiBold)
                                    Text("Status: ${appt.status}", fontSize = 12.sp, color = BrandPalette.TextSecondary)
                                }
                                if (appt.status == "SCHEDULED" || appt.status == "CONFIRMED") {
                                    TextButton(
                                        onClick = { viewModel.cancelAppointment(appt.id) { } },
                                        enabled = !isLoading,
                                    ) {
                                        Text("Cancelar")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = selectedDateMillis)
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { selectedDateMillis = it }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = state)
        }
    }

    if (showTimePicker) {
        val state = rememberTimePickerState(initialHour = selectedHour, initialMinute = selectedMinute)
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    selectedHour = state.hour
                    selectedMinute = state.minute
                    showTimePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) { Text("Cancelar") }
            },
            text = { TimePicker(state = state) },
        )
    }
}
