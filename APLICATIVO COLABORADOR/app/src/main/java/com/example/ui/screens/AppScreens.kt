package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.Branding
import com.example.data.*
import com.example.data.api.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.viewmodel.AppViewModel
import kotlinx.coroutines.flow.*
import java.text.DecimalFormat

val df = DecimalFormat("R$ #,##0.00")

@Composable
fun MainAppContainer(viewModel: AppViewModel, activeScreen: String, onNavigate: (String) -> Unit) {
    ColaboradorBackground {
        when (activeScreen) {
            "LOGIN" -> LoginScreen(viewModel, onNavigate)
            "MAIN" -> BottomNavigationContainer(viewModel, onNavigate)
            "ORDER_DETAILS" -> OrderDetailsScreen(viewModel, onNavigate)
            "COMMISSION_DETAILS" -> CommissionDetailsScreen(viewModel, onNavigate)
            "SCHEDULE" -> ScheduleScreen(viewModel, onNavigate)
            "REQUESTS" -> RequestsScreen(viewModel, onNavigate)
            "NEW_REQUEST" -> NewRequestScreen(viewModel, onNavigate)
            "ANNOUNCEMENTS" -> AnnouncementsScreen(viewModel, onNavigate)
            "PERFORMANCE" -> PerformanceScreen(viewModel, onNavigate)
            "DOCUMENTS" -> DocumentsScreen(viewModel, onNavigate)
        }

        // Global Overlay Loading Screen
        val isLoading by viewModel.loading.collectAsState()
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0x990B0B0C)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = RedButton)
            }
        }

        // Global API Error Snackbar Banner
        val apiError by viewModel.apiError.collectAsState()
        if (apiError != null) {
            Snackbar(
                action = {
                    TextButton(onClick = { viewModel.clearError() }) {
                        Text("OK", color = GoldAccent)
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                Text(apiError ?: "")
            }
        }
    }
}

// 1. LOGIN SCREEN
@Composable
fun LoginScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }

    val user by viewModel.currentUser.collectAsState()
    LaunchedEffect(user) {
        if (user != null) {
            onNavigate("MAIN")
        }
    }

    Scaffold(
        containerColor = Color.Transparent
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(30.dp))
            BetoLogo(size = 150.dp)
            Spacer(modifier = Modifier.height(40.dp))

            AppCard(backgroundColor = GlassSurface) {
                Text(
                    text = "Acesse sua conta",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                Text(
                    text = "Entre com seu usuário e senha",
                    color = TextSecondary,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                InputField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Usuário ou e-mail",
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextSecondary) },
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                InputField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Senha",
                    isPassword = !showPassword,
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextSecondary) },
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                imageVector = if (showPassword) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = "Mostrar senha",
                                tint = TextSecondary
                            )
                        }
                    },
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                AppButton(
                    text = "Entrar",
                    onClick = { viewModel.login(email, password) }
                )

                Spacer(modifier = Modifier.height(20.dp))

                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Esqueci minha senha",
                        color = TextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clickable { /* Forgotten logic */ }
                            .padding(8.dp)
                    )
                }
            }
        }
    }
}

// 2. BOTTOM NAVIGATION CONTAINER
@Composable
fun BottomNavigationContainer(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val activeTab by viewModel.activeTab.collectAsState()
    val isOffline by viewModel.isOffline.collectAsState()

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF0F0F11),
                tonalElevation = 8.dp
            ) {
                listOf("Início", "OS", "Comissões", "Ponto", "Perfil").forEach { tab ->
                    val selected = activeTab == tab
                    val icon = when (tab) {
                        "Início" -> if (selected) Icons.Default.Home else Icons.Outlined.Home
                        "OS" -> if (selected) Icons.Default.Build else Icons.Outlined.Build
                        "Comissões" -> if (selected) Icons.Default.Payments else Icons.Outlined.Payments
                        "Ponto" -> if (selected) Icons.Default.Schedule else Icons.Outlined.Schedule
                        else -> if (selected) Icons.Default.AccountCircle else Icons.Outlined.AccountCircle
                    }
                    NavigationBarItem(
                        selected = selected,
                        onClick = { viewModel.selectTab(tab) },
                        icon = { Icon(icon, contentDescription = tab) },
                        label = { Text(tab, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RedButton,
                            selectedTextColor = RedButton,
                            unselectedIconColor = TextSecondary,
                            unselectedTextColor = TextSecondary,
                            indicatorColor = Color(0xFF1F1F24)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            if (isOffline) {
                OfflineScreen(onRetry = { viewModel.retryConnection() })
            } else {
                when (activeTab) {
                    "Início" -> HomeScreen(viewModel, onNavigate)
                    "OS" -> MyOrdersScreen(viewModel, onNavigate)
                    "Comissões" -> CommissionsScreen(viewModel, onNavigate)
                    "Ponto" -> TimeClockScreen(viewModel)
                    "Perfil" -> ProfileScreen(viewModel, onNavigate)
                }
            }
        }
    }
}

// 3. HOME SCREEN
@Composable
fun HomeScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val user by viewModel.currentUser.collectAsState()
    val profile by viewModel.employeeProfile.collectAsState()
    val resumo by viewModel.dashboardResumo.collectAsState()
    val totalComm by viewModel.commissionTotals.collectAsState()
    val alerts by viewModel.announcements.collectAsState()

    val osOficinaHoje = resumo?.os_oficina_hoje ?: 0
    val osMinhasExec = resumo?.os_minhas_em_execucao ?: resumo?.os_em_execucao ?: 0
    val comissaoPrevista = resumo?.comissao_prevista ?: totalComm?.prevista ?: 0.0
    val turno = resumo?.proximo_turno
    val turnoText = if (turno != null && turno.inicio.isNotBlank()) {
        "${turno.inicio} - ${turno.fim}"
    } else {
        "Sem escala hoje"
    }
    val displayName = profile?.nome ?: user?.nome ?: "Colaborador"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Welcome and Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Olá, ${displayName.split(" ").first()}!",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Bom dia! Vamos juntos fazer um grande dia.",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            }
            // Circular Avatar Placeholder
            Box(
                modifier = Modifier
                    .size(45.dp)
                    .background(Color(0xFF2C2C32), shape = CircleShape)
                    .border(1.dp, GoldAccent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = (user?.nome ?: "C").take(1),
                    color = GoldAccent,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        }

        // Center Beto Brand Logo Logo
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            BetoLogo(size = 110.dp)
        }

        SectionTitle("Resumo do dia")

        // 2x2 summary cards
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AppCard(modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.Assignment, "OS hoje", tint = RedButton, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("OS oficina hoje", color = TextSecondary, fontSize = 12.sp)
                Text("$osOficinaHoje", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Ver todas", color = RedButton, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { viewModel.selectTab("OS") })
            }
            AppCard(modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.PlayCircle, "Em execução", tint = StatusWarning, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Minhas em execução", color = TextSecondary, fontSize = 12.sp)
                Text("$osMinhasExec", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Ver todas", color = RedButton, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { viewModel.selectTab("OS") })
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AppCard(modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.MonetizationOn, "Comissão prevista", tint = StatusSuccess, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Comissão prevista", color = TextSecondary, fontSize = 12.sp)
                Text(df.format(comissaoPrevista), color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            AppCard(modifier = Modifier.weight(1f)) {
                Icon(Icons.Default.AccessTime, "Próximo turno", tint = StatusBlue, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Próximo turno", color = TextSecondary, fontSize = 12.sp)
                Text(turnoText, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Action grid title
        SectionTitle("Ações rápidas")

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            listOf(
                Triple("Minhas OS", Icons.Default.Assignment, "OS"),
                Triple("Comissões", Icons.Default.Payments, "Comissões"),
                Triple("Bater Ponto", Icons.Default.Fingerprint, "Ponto"),
                Triple("Escala", Icons.Default.CalendarToday, "SCHEDULE")
            ).forEach { (label, icon, route) ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clickable {
                            if (route == "SCHEDULE") onNavigate(route) else viewModel.selectTab(route)
                        }
                        .padding(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .background(Color(0xFF1E1E22), shape = RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(icon, contentDescription = label, tint = RedButton, modifier = Modifier.size(28.dp))
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(label, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
            }
        }

        // Non-read announcements section
        val unreadAlerts = alerts.filter { !it.lido }
        if (unreadAlerts.isNotEmpty()) {
            SectionTitle("Comunicados não lidos", actionText = "Ver todos", onActionClick = { onNavigate("ANNOUNCEMENTS") })
            unreadAlerts.forEach { alert ->
                AppCard(modifier = Modifier.clickable { onNavigate("ANNOUNCEMENTS") }) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(alert.titulo, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(alert.mensagem, color = TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(RedButton, shape = CircleShape)
                        )
                    }
                }
            }
        }
    }
}

// 4. MY ORDERS SCREEN
@Composable
fun MyOrdersScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val orders by viewModel.myOrders.collectAsState()
    val resumo by viewModel.dashboardResumo.collectAsState()
    var searchParam by remember { mutableStateOf("") }
    var selectedStatusTab by remember { mutableStateOf("Todas") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Decorative search header with branding logo watermark
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Minhas OS", color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("${orders.size} ordens encontradas", color = TextSecondary, fontSize = 12.sp)
                Text(
                    "Oficina hoje: ${resumo?.os_oficina_hoje ?: 0} · Minhas em execução: ${resumo?.os_minhas_em_execucao ?: resumo?.os_em_execucao ?: 0} · Produzidas no mês: ${resumo?.os_produzidas_mes ?: 0}",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            BetoLogo(size = 50.dp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        InputField(
            value = searchParam,
            onValueChange = { searchParam = it },
            label = "Buscar por cliente, placa ou OS",
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
            trailingIcon = { Icon(Icons.Default.FilterList, contentDescription = null, tint = RedButton) }
        )

        // Filter tabs scroll
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("Todas", "Em execução", "Finalizadas", "Aguardando aprovação").forEach { tab ->
                val selected = selectedStatusTab == tab
                Box(
                    modifier = Modifier
                        .background(
                            if (selected) RedButton else Color(0xFF1E1E22),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .clickable { selectedStatusTab = tab }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        tab,
                        color = if (selected) Color.White else TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // List
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.weight(1f)
        ) {
            val filtered = orders.filter { order ->
                val matchesSearch = order.numero.contains(searchParam, true) ||
                        order.veiculo_modelo.contains(searchParam, true) ||
                        order.placa.contains(searchParam, true) ||
                        order.cliente_nome.contains(searchParam, true)
                
                val matchesTab = when (selectedStatusTab) {
                    "Todas" -> true
                    "Em execução" -> order.status == "em_execucao"
                    "Finalizadas" -> order.status == "finalizada"
                    "Aguardando aprovação" -> order.status == "aguardando_aprovacao"
                    else -> true
                }
                matchesSearch && matchesTab
            }

            items(filtered) { order ->
                AppCard(modifier = Modifier.clickable {
                    viewModel.loadOrderDetails(order.id)
                    onNavigate("ORDER_DETAILS")
                }) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column {
                            Text(order.numero, color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text(order.veiculo_modelo, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Placa: ${order.placa} • Cliente: ${order.cliente_nome}", color = TextSecondary, fontSize = 12.sp)
                            Text("Serviços: ${order.servicos_executados_por_mim}", color = TextSecondary, fontSize = 12.sp)
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                Text("Comissão prevista: ", color = TextSecondary, fontSize = 12.sp)
                                Text(df.format(order.comissao_prevista), color = StatusSuccess, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        StatusBadge(status = order.status)
                    }
                }
            }
        }
    }
}

// 5. ORDER DETAILS SCREEN
@Composable
fun OrderDetailsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val details by viewModel.currentOrder.collectAsState()

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = details?.numero ?: "Detalhes da OS", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        if (details == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RedButton)
            }
        } else {
            val item = details!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Vehicle card header
                AppCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Custom motor icon
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .background(Color(0xFF2C2C32), shape = RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.TwoWheeler, "Moto", tint = RedButton, modifier = Modifier.size(36.dp))
                        }
                        Column {
                            Text(item.veiculo_modelo, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("Placa: ${item.placa} • ${item.km} KM", color = TextSecondary, fontSize = 13.sp)
                            Text("Cliente: ${item.cliente_nome}", color = TextSecondary, fontSize = 13.sp)
                        }
                    }
                }

                SectionTitle("Minha participação")
                AppCard {
                    listOf(
                        "Responsável pelo checklist" to item.responsavel_checklist,
                        "Doagnóstico técnico" to item.responsavel_diagnostico,
                        "Executor de serviços" to item.executor_servicos
                    ).forEach { (label, active) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = if (active) Icons.Default.CheckCircle else Icons.Default.Cancel,
                                contentDescription = null,
                                tint = if (active) StatusSuccess else TextSecondary,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(label, color = if (active) TextPrimary else TextSecondary, fontSize = 14.sp)
                        }
                    }
                }

                SectionTitle("Serviços executados por mim")
                item.servicos.forEach { service ->
                    AppCard(modifier = Modifier.padding(bottom = 10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(service.descricao, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text("Valor base: ${df.format(service.valor_base)}", color = TextSecondary, fontSize = 12.sp)
                                Text("Regra: ${service.regra_comissao}", color = TextSecondary, fontSize = 12.sp)
                                Row {
                                    Text("Previsão comissão: ", color = TextSecondary, fontSize = 12.sp)
                                    Text(df.format(service.comissao_prevista), color = StatusSuccess, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            StatusBadge(status = service.status_comissao)
                        }
                    }
                }

                SectionTitle("Histórico da minha participação")
                AppCard {
                    item.historico.forEachIndexed { idx, log ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(RedButton, shape = CircleShape)
                                )
                                if (idx < item.historico.size - 1) {
                                    Box(
                                        modifier = Modifier
                                            .width(2.dp)
                                            .height(30.dp)
                                            .background(Color(0xFF2C2C32))
                                    )
                                }
                            }
                            Column {
                                Text(log.data_hora, color = TextSecondary, fontSize = 11.sp)
                                Text(log.descricao, color = TextPrimary, fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(14.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// 6. COMMISSIONS SCREEN
@Composable
fun CommissionsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val commissions by viewModel.commissions.collectAsState()
    val totals by viewModel.commissionTotals.collectAsState()
    val rules by viewModel.commissionRules.collectAsState()
    val resumo by viewModel.dashboardResumo.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Minhas Comissões", color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Total individual deste período", color = TextSecondary, fontSize = 12.sp)
            }
            BetoLogo(size = 50.dp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Large totalizers grid matching reference Screenshot
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CommissionSumChip("Prevista (em execução)", df.format(totals?.prevista ?: resumo?.comissao_prevista ?: 0.0), StatusWarning, Modifier.weight(1f))
            CommissionSumChip("A receber no mês", df.format(resumo?.comissao_mes_a_receber ?: ((totals?.pendente ?: 0.0) + (totals?.aprovada ?: 0.0))), StatusDanger, Modifier.weight(1f))
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CommissionSumChip("Hoje", df.format(resumo?.comissao_hoje ?: 0.0), StatusSuccess, Modifier.weight(1f))
            CommissionSumChip("Paga / Pendente", "${df.format(totals?.paga ?: resumo?.comissao_paga_mes ?: 0.0)} / ${df.format(totals?.pendente ?: resumo?.comissao_pendente ?: 0.0)}", StatusBlue, Modifier.weight(1f))
        }

        if (rules.isNotEmpty()) {
            SectionTitle("Como funciona sua comissão")
            AppCard {
                rules.forEachIndexed { idx, rule ->
                    Text(
                        text = rule.description ?: "Regra ${rule.ruleType}",
                        color = TextPrimary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(vertical = 6.dp),
                    )
                    if (idx < rules.lastIndex) {
                        HorizontalDivider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                    }
                }
            }
        }

        SectionTitle("Lançamentos")

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(commissions) { com ->
                AppCard(modifier = Modifier.clickable {
                    viewModel.loadCommissionDetails(com.id)
                    onNavigate("COMMISSION_DETAILS")
                }) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(com.os_numero, color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(com.descricao, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text(com.regra, color = TextSecondary, fontSize = 12.sp)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(df.format(com.valor_comissao), color = StatusSuccess, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            StatusBadge(status = com.status.name.lowercase())
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CommissionSumChip(title: String, amount: String, borderCol: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(GraphiteCard, shape = RoundedCornerShape(10.dp))
            .border(1.dp, borderCol.copy(alpha = 0.5f), shape = RoundedCornerShape(10.dp))
            .padding(12.dp)
    ) {
        Column {
            Text(title, color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(amount, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Black)
        }
    }
}

// 7. COMMISSION DETAILS SCREEN
@Composable
fun CommissionDetailsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val details by viewModel.currentCommission.collectAsState()

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Comissão Detalhes", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        if (details == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RedButton)
            }
        } else {
            val item = details!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                AppCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(item.os_numero, color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(item.descricao, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                        StatusBadge(item.status.name)
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    val lines = listOf(
                        "Tipo" to item.tipo.replaceFirstChar { it.uppercase() },
                        "Valor do Serviço" to df.format(item.base_valor),
                        "Regra" to item.regra,
                        "Percentual" to "${item.percentual ?: 20}%",
                    )

                    lines.forEach { (lbl, valStr) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(lbl, color = TextSecondary, fontSize = 14.sp)
                            Text(valStr, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Valor da comissão", color = RedButton, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text(df.format(item.valor_comissao), color = RedButton, fontSize = 24.sp, fontWeight = FontWeight.Black)
                    }

                    val dateLines = listOf(
                        "Data de geração" to item.data_geracao.replace("T", " às "),
                        "Previsão de pagamento" to (item.previsao_pagamento ?: "--"),
                        "Data de pagamento" to (item.data_pagamento ?: "--"),
                        "Observação" to (item.observacao ?: "Comissão gerada automaticamente pela execução do serviço.")
                    )

                    dateLines.forEach { (lbl, valStr) ->
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                            Text(lbl, color = TextSecondary, fontSize = 13.sp)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(valStr, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }

                Spacer(modifier = Modifier.weight(1f))
                BetoLogo(size = 90.dp)
            }
        }
    }
}

// 8. TIME CLOCK SCREEN (PONTO)
@Composable
fun TimeClockScreen(viewModel: AppViewModel) {
    val punches by viewModel.timeClocks.collectAsState()
    val status by viewModel.clockStatus.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Meu Ponto", color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.CalendarToday, null, tint = TextSecondary, modifier = Modifier.size(14.dp))
                    LiveDateLabel()
                    Box(modifier = Modifier.background(Color(0xFF1B4325), RoundedCornerShape(4.dp)).padding(horizontal = 4.dp, vertical = 2.dp)) {
                        Text("Hoje", color = StatusSuccess, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            BetoLogo(size = 50.dp)
        }

        Spacer(modifier = Modifier.height(20.dp))

        AppCard(backgroundColor = Color(0xFF131315)) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(modifier = Modifier.size(24.dp).background(Color(0x3322C55E), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Schedule, null, tint = StatusSuccess, modifier = Modifier.size(16.dp))
                    }
                    Text("Horário do celular", color = TextSecondary, fontSize = 13.sp)
                }

                LiveClock(fontSize = 44.sp)

                Text(
                    text = when (status?.proxima_acao) {
                        "iniciar_intervalo" -> "Entrada registrada"
                        "voltar_do_intervalo" -> "Intervalo iniciado"
                        "registrar_saida" -> "Intervalo finalizado"
                        "finalizado" -> "Saída registrada"
                        else -> "Bater entrada"
                    },
                    color = TextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Vertical timeline dots
        AppCard {
            listOf(
                Triple("Entrada", "entrada", "--"),
                Triple("Intervalo início", "intervalo_inicio", "--"),
                Triple("Intervalo fim", "intervalo_fim", "--"),
                Triple("Saída", "saida", "--")
            ).forEachIndexed { idx, (label, tipo, stubHr) ->
                val record = punches.firstOrNull { it.tipo == tipo }
                val registered = record != null
                val timeVal = record?.hora ?: stubHr

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .border(
                                    width = 1.5.dp,
                                    color = if (registered) StatusSuccess else Color(0xFF2C2C32),
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (registered) {
                                Box(modifier = Modifier.size(12.dp).background(StatusSuccess, CircleShape))
                            }
                        }
                        Text(label, color = if (registered) TextPrimary else TextSecondary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(timeVal, color = if (registered) TextPrimary else TextSecondary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
                if (idx < 3) {
                    Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        val act = status?.proxima_acao ?: "registrar_entrada"
        if (act != "finalizado") {
            AppButton(
                text = when (act) {
                    "iniciar_intervalo" -> "Iniciar intervalo"
                    "voltar_do_intervalo" -> "Voltar do intervalo"
                    "registrar_saida" -> "Registrar saída"
                    else -> "Registrar entrada"
                },
                onClick = { viewModel.punchClock(act) }
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0x2222C55E), RoundedCornerShape(10.dp))
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("Carga horária diária finalizada!", color = StatusSuccess, fontWeight = FontWeight.Bold)
            }
        }

        TimeClockDisclaimer()
    }
}

// 9. SCHEDULE SCREEN
@Composable
fun ScheduleScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val weekly by viewModel.weeklySchedule.collectAsState()
    val resumo by viewModel.dashboardResumo.collectAsState()
    val turno = resumo?.proximo_turno

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Minha Escala", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            BetoLogo(size = 90.dp)
            Spacer(modifier = Modifier.height(16.dp))

            // Scrollable day chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf(
                    "Dom" to "21", "Seg" to "22", "Ter" to "23",
                    "Qua" to "24", "Qui" to "25", "Sex" to "26", "Sáb" to "27"
                ).forEach { (day, num) ->
                    val selected = num == "21" // selected Mon representation
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(day, color = TextSecondary, fontSize = 11.sp)
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .background(if (selected) RedButton else Color.Transparent, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(num, color = if (selected) Color.White else TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            SectionTitle("Próximo turno")
            AppCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(Color(0xFF2C2C32), shape = RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Alarm, null, tint = RedButton, modifier = Modifier.size(24.dp))
                    }
                    Column {
                        Text(turno?.data ?: "Próximo turno", color = TextSecondary, fontSize = 12.sp)
                        Text(
                            if (turno != null && turno.inicio.isNotBlank()) "${turno.inicio} às ${turno.fim}"
                            else "Sem escala cadastrada",
                            color = TextPrimary,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                }
            }

            SectionTitle("Escala da semana")
            AppCard {
                weekly.forEachIndexed { idx, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(item.data, color = TextSecondary, fontSize = 13.sp)
                            Text(item.dia_semana.take(3), color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        if (item.tipo == "folga") {
                            Text("Folga", color = StatusSuccess, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        } else {
                            Text("${item.inicio} - ${item.fim}", color = TextPrimary, fontSize = 14.sp)
                        }
                    }
                    if (idx < weekly.size - 1) {
                        Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = { onNavigate("NEW_REQUEST") },
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GraphiteCard, contentColor = TextPrimary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Solicitar Folga", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { onNavigate("NEW_REQUEST") },
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GraphiteCard, contentColor = TextPrimary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Troca de Escala", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// 10. REQUESTS SCREEN (SOLICITAÇÕES)
@Composable
fun RequestsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val reqs by viewModel.requests.collectAsState()
    var selectedFilter by remember { mutableStateOf("Todas") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Minhas Solicitações", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            // Horizontal scrollable filter chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Todas", "Em análise", "Aprovadas", "Recusadas").forEach { tab ->
                    val selected = selectedFilter == tab
                    Box(
                        modifier = Modifier
                            .background(
                                if (selected) RedButton else Color(0xFF1E1E22),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedFilter = tab }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(tab, color = if (selected) Color.White else TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Box scrollable list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                val filtered = reqs.filter {
                    when (selectedFilter) {
                        "Todas" -> true
                        "Em análise" -> it.status == "em_analise"
                        "Aprovadas" -> it.status == "aprovada"
                        "Recusadas" -> it.status == "recusada"
                        else -> true
                    }
                }

                items(filtered) { r ->
                    AppCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column {
                                val dspl = when (r.tipo) {
                                    "folga" -> "Folga"
                                    "ajuste_ponto" -> "Ajuste de ponto"
                                    "troca_escala" -> "Troca de escala"
                                    else -> r.tipo.replaceFirstChar { it.uppercase() }
                                }
                                Text(dspl, color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 16.sp)
                                Text(r.data_referencia, color = TextSecondary, fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(r.descricao, color = TextSecondary, fontSize = 13.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(r.created_at, color = TextSecondary, fontSize = 11.sp)
                            }
                            StatusBadge(status = r.status)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            AppButton(
                text = "+ Nova Solicitação",
                onClick = { onNavigate("NEW_REQUEST") }
            )

            Spacer(modifier = Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                BetoLogo(size = 80.dp)
            }
        }
    }
}

// 11. NEW REQUEST SCREEN
@Composable
fun NewRequestScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    var type by remember { mutableStateOf("folga") }
    var date by remember { mutableStateOf("25/06/2026") }
    var desc by remember { mutableStateOf("") }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Nova Solicitação", onBack = { onNavigate("REQUESTS") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Selecione o tipo de solicitação", color = TextSecondary, fontSize = 13.sp)

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "folga" to "Folga",
                    "ajuste_ponto" to "Ajuste Ponto",
                    "troca_escala" to "Escala"
                ).forEach { (slug, lbl) ->
                    val selected = type == slug
                    Box(
                        modifier = Modifier
                            .background(if (selected) RedButton else GraphiteCard, shape = RoundedCornerShape(8.dp))
                            .clickable { type = slug }
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(lbl, color = if (selected) Color.White else TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            InputField(
                value = date,
                onValueChange = { date = it },
                label = "Data de Referência (DD/MM/AAAA)"
            )

            Text("Justificativa", color = TextSecondary, fontSize = 13.sp)

            OutlinedTextField(
                value = desc,
                onValueChange = { desc = it },
                placeholder = { Text("Escreva em detalhes seu motivo...", color = TextSecondary) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = RedButton,
                    unfocusedBorderColor = Color(0xFF2C2C32),
                    focusedContainerColor = Color(0xFF131315),
                    unfocusedContainerColor = Color(0xFF131315)
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            AppButton(
                text = "Enviar Solicitação",
                onClick = {
                    if (desc.isNotBlank()) {
                        viewModel.submitRequest(type, date, desc) {
                            onNavigate("REQUESTS")
                        }
                    }
                }
            )
        }
    }
}

// 12. ANNOUNCEMENTS SCREEN
@Composable
fun AnnouncementsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val items by viewModel.announcements.collectAsState()

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Comunicados da Oficina", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(items) { ann ->
                    AppCard {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(ann.titulo, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(ann.data_publicacao, color = TextSecondary, fontSize = 11.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(ann.mensagem, color = TextPrimary, fontSize = 14.sp)
                            }
                            if (!ann.lido) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(RedButton, shape = CircleShape)
                                        .clickable { viewModel.markAnnouncementLido(ann.id) }
                                )
                            }
                        }
                        if (!ann.lido) {
                            Spacer(modifier = Modifier.height(12.dp))
                            TextButton(
                                onClick = { viewModel.markAnnouncementLido(ann.id) },
                                colors = ButtonDefaults.textButtonColors(contentColor = RedButton)
                            ) {
                                Text("MARCAR COMO LIDO")
                            }
                        }
                    }
                }
            }
        }
    }
}

// 13. PERFORMANCE SCREEN
@Composable
fun PerformanceScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val met by viewModel.performance.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadPerformance()
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Meu Desempenho", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        if (met == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = RedButton)
            }
        } else {
            val metrics = met!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                BetoLogo(size = 90.dp)

                Text("Acompanhamento de Produtividade Pessoal", color = TextSecondary, fontSize = 13.sp)

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(
                        "OS" to metrics.os_finalizadas.toString(),
                        "Serviços" to metrics.servicos_executados.toString(),
                        "Comissão" to df.format(metrics.comissao_gerada),
                    ).forEach { (lbl, valStr) ->
                        AppCard(modifier = Modifier.weight(1f)) {
                            Text(lbl, color = TextSecondary, fontSize = 11.sp)
                            Text(valStr, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                if (metrics.series_semanal.isNotEmpty()) {
                    AppCard {
                        WeeklyBarChart(data = metrics.series_semanal)
                    }
                }

                AppCard {
                    listOf(
                        "OS finalizadas" to metrics.os_finalizadas.toString(),
                        "Serviços executados" to metrics.servicos_executados.toString(),
                        "Checklists realizados" to metrics.checklists_realizados.toString(),
                        "Fotos enviadas" to metrics.fotos_enviadas.toString(),
                        "Comissão total" to df.format(metrics.comissao_gerada),
                        "Tempo médio OS" to metrics.tempo_medio_os
                    ).forEach { (lbl, valStr) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(lbl, color = TextSecondary, fontSize = 14.sp)
                            Text(valStr, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                        Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                    }
                }

                SectionTitle("Metas Individuais")
                AppCard {
                    GoalProgressBars(metas = metrics.metas)
                }
            }
        }
    }
}

// 14. DOCUMENTS SCREEN
@Composable
fun DocumentsScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val docs by viewModel.documents.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadDocuments()
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            OptHeader(title = "Documentos e Recibos", onBack = { onNavigate("MAIN") })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            if (docs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum documento disponível.", color = TextSecondary, fontSize = 14.sp)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(docs) { doc ->
                        AppCard {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.TextSnippet, null, tint = GoldAccent, modifier = Modifier.size(34.dp))
                                    Column {
                                        Text(doc.nome, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("Tipo: ${doc.tipo} • ${doc.data}", color = TextSecondary, fontSize = 12.sp)
                                    }
                                }
                                IconButton(
                                    onClick = {
                                        doc.url?.let { url ->
                                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                        }
                                    },
                                    enabled = !doc.url.isNullOrBlank(),
                                ) {
                                    Icon(Icons.Default.Download, "Visualizar", tint = RedButton)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// 15. PROFILE SCREEN (PROFILE TAB)
@Composable
fun ProfileScreen(viewModel: AppViewModel, onNavigate: (String) -> Unit) {
    val user by viewModel.currentUser.collectAsState()
    val profile by viewModel.employeeProfile.collectAsState()
    val context = LocalContext.current

    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        uri?.let {
            context.contentResolver.openInputStream(it)?.use { stream ->
                val bytes = stream.readBytes()
                val mime = context.contentResolver.getType(it) ?: "image/jpeg"
                viewModel.uploadProfilePhoto(bytes, mime)
            }
        }
    }

    val displayName = profile?.nome ?: user?.nome ?: "Colaborador"
    val displayRole = profile?.cargo ?: user?.cargo ?: "—"
    val photoUrl = profile?.photoUrl

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Logo and Avatar card
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            BetoLogo(size = 110.dp)

            // Dynamic avatar placeholder matching reference screenshots
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2C2C32), shape = CircleShape)
                    .border(2.dp, RedButton, CircleShape)
                    .clickable {
                        photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                contentAlignment = Alignment.Center
            ) {
                if (!photoUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(context).data(photoUrl).crossfade(true).build(),
                        contentDescription = "Foto de perfil",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Text(
                        text = displayName.take(1),
                        color = RedButton,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }

        Text(
            text = displayName,
            color = TextPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            text = displayRole,
            color = TextSecondary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.offset(y = (-8).dp)
        )

        AppCard {
            listOf(
                "CPF" to (profile?.cpf ?: "—"),
                "RG" to (profile?.rg ?: "—"),
                "Endereço" to (profile?.address ?: "—"),
                "Telefone" to (profile?.phone ?: "—"),
                "E-mail" to (profile?.email ?: "—"),
                "Admissão" to (profile?.hireDate ?: "—"),
            ).forEachIndexed { idx, (label, value) ->
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Text(label, color = TextSecondary, fontSize = 12.sp)
                    Text(value, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
                if (idx < 5) Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Toque na foto para alterar",
                color = TextSecondary,
                fontSize = 12.sp,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
            )
        }

        // Navigation menu buttons lists
        AppCard {
            val menu = listOf(
                "Minha escala" to "SCHEDULE",
                "Minhas solicitações" to "REQUESTS",
                "Comunicados" to "ANNOUNCEMENTS",
                "Meu desempenho" to "PERFORMANCE",
                "Documentos e recibos" to "DOCUMENTS"
            )

            menu.forEachIndexed { idx, (label, route) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigate(route) }
                        .padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val icon = when (route) {
                            "SCHEDULE" -> Icons.Default.CalendarToday
                            "REQUESTS" -> Icons.Default.Grading
                            "ANNOUNCEMENTS" -> Icons.Default.VolumeUp
                            "PERFORMANCE" -> Icons.Default.Leaderboard
                            else -> Icons.Default.Description
                        }
                        Icon(icon, null, tint = RedButton, modifier = Modifier.size(20.dp))
                        Text(label, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = TextSecondary)
                }
                if (idx < menu.size - 1) {
                    Divider(color = Color(0xFF2C2C32), thickness = 0.5.dp)
                }
            }
        }

        // Red sign out button at bottom matching Screenshot
        AppCard {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.logout() }
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Logout, null, tint = RedButton, modifier = Modifier.size(20.dp))
                    Text("Sair da conta", color = RedButton, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// 16. OFFLINE FALLBACK SCREEN
@Composable
fun OfflineScreen(onRetry: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(Icons.Default.CloudOff, null, tint = RedButton, modifier = Modifier.size(72.dp))
            Text(
                "Sem conexão com a internet",
                color = TextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                "Verifique sua conexão para acessar suas informações da oficina.",
                color = TextSecondary,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(12.dp))
            AppButton(
                text = "Tentar novamente",
                onClick = onRetry
            )
        }
    }
}

// OPTIONAL TOP HEADER
@Composable
fun OptHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .background(Color(0xFF0B0B0C))
            .height(56.dp)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = TextPrimary)
        }
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
