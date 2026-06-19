package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.OrderStatus
import com.example.data.service.SessionManager
import com.example.ui.components.*
import com.example.ui.config.Branding
import com.example.ui.theme.*
import com.example.ui.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: DashboardViewModel,
    onNavigateToOrderDetails: (String) -> Unit,
    onNavigateToOrdersList: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val userName = SessionManager.currentUser?.name ?: "Beto Souza"
    val userRole = SessionManager.currentUser?.role ?: "Administrador"

    val metrics by viewModel.metrics.collectAsState()
    val priorityOrders by viewModel.priorityOrders.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()

    val isOffline by viewModel.isOfflineMode.collectAsState()
    val lastApiError by viewModel.lastApiError.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadDashboardContent()
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Gradient Header Branding Area (Artistic Flair Theme)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(DarkSurface, Color.Transparent)
                        )
                    )
                    .padding(top = 20.dp, bottom = 12.dp, start = 16.dp, end = 16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Logo group
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Rotate-45 red square styled box
                            Box(
                                modifier = Modifier
                                    .size(42.dp)
                                    .rotate(45f)
                                    .background(CrimsonRed, RoundedCornerShape(8.dp))
                                    .border(2.dp, PremiumGold.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "B",
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.rotate(-45f)
                                )
                            }
                            
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "BETO ",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = FrostWhite,
                                            letterSpacing = 0.5.sp
                                        )
                                    )
                                    Text(
                                        text = "MECÂNICA",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = CrimsonRed,
                                            letterSpacing = 0.5.sp
                                        )
                                    )
                                }
                                Text(
                                    text = "GESTÃO OPERACIONAL INTERNA",
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = MetallicSilver,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 1.sp
                                    )
                                )
                            }
                        }
                        
                        // Online/offline status controller
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = if (isOffline) "OFFLINE" else "ONLINE",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (isOffline) WarningAmber else SuccessGreen,
                                    fontSize = 10.sp
                                )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Switch(
                                checked = !isOffline,
                                onCheckedChange = { viewModel.toggleOffline() },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = SuccessGreen,
                                    checkedTrackColor = SuccessGreen.copy(alpha = 0.3f),
                                    uncheckedThumbColor = WarningAmber,
                                    uncheckedTrackColor = Graphite
                                )
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(14.dp))
                    
                    // Golden bar with dynamic welcome greeting
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Boa tarde, $userName",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = PremiumGold,
                                fontWeight = FontWeight.Medium,
                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                            )
                        )
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(1.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        colors = listOf(PremiumGold.copy(alpha = 0.5f), Color.Transparent)
                                    )
                                )
                        )
                    }
                }
            }

            // Simulated Warning Banner if active and no live backend connected
            AnimatedVisibility(visible = lastApiError != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = Graphite),
                    border = BorderStroke(1.dp, PremiumGold)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(imageVector = Icons.Default.WifiOff, contentDescription = "Offline", tint = PremiumGold)
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "MODO RECONEXÃO LOCAL",
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                            )
                            Text(
                                text = "Gravando modificações internamente. Prontidão para sincronizar com Supabase Backend ERP.",
                                style = MaterialTheme.typography.bodySmall.copy(color = LightSilver)
                            )
                        }
                        IconButton(onClick = { viewModel.clearLastError() }) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = LightSilver)
                        }
                    }
                }
            }
 
            // Dashboard Container
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header spacing item
                item {
                    Spacer(modifier = Modifier.height(4.dp))
                }
 
                // Grid stats
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            DashboardMetricCard(
                                count = metrics["os_aguardando_checklist"] ?: 0,
                                label = "Aguardando Checklist",
                                icon = { Icon(Icons.Default.CameraAlt, "Checklist", tint = AccentRed, modifier = Modifier.size(24.dp)) },
                                onClick = { onNavigateToOrdersList("Checklist") },
                                borderColor = CrimsonRed,
                                modifier = Modifier.weight(1f)
                            )
                            DashboardMetricCard(
                                count = metrics["em_analise"] ?: 0,
                                label = "Em Análise Técnica",
                                icon = { Icon(Icons.Default.Engineering, "Analysis", tint = WarningAmber, modifier = Modifier.size(24.dp)) },
                                onClick = { onNavigateToOrdersList("Em análise") },
                                borderColor = PremiumGold,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            DashboardMetricCard(
                                count = metrics["aguardando_aprovacao"] ?: 0,
                                label = "Aguardando Aprovação",
                                icon = { Icon(Icons.Default.HourglassEmpty, "Approval", tint = PremiumGold, modifier = Modifier.size(24.dp)) },
                                onClick = { onNavigateToOrdersList("Aguardando aprovação") },
                                borderColor = PremiumGold,
                                modifier = Modifier.weight(1f)
                            )
                            DashboardMetricCard(
                                count = metrics["finalizadas_hoje"] ?: 0,
                                label = "Finalizadas Hoje",
                                icon = { Icon(Icons.Default.CheckCircle, "Completed", tint = SuccessGreen, modifier = Modifier.size(24.dp)) },
                                onClick = { onNavigateToOrdersList("Finalizadas") },
                                borderColor = SuccessGreen,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Quick actions header
                item {
                    Text(
                        text = "AÇÕES OPERACIONAIS",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MetallicSilver,
                            letterSpacing = 1.sp
                        )
                    )
                }

                // Quick actions buttons row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { onNavigateToOrdersList("Todas") },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, Graphite),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(vertical = 4.dp)) {
                                Icon(Icons.Default.ListAlt, contentDescription = "OS", tint = CrimsonRed)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text("Ver todas OS", fontSize = 11.sp, color = FrostWhite, fontWeight = FontWeight.Bold)
                            }
                        }

                        Button(
                            onClick = { onNavigateToOrdersList("Checklist") },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, Graphite),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(vertical = 4.dp)) {
                                Icon(Icons.Default.Camera, contentDescription = "Vistorias", tint = PremiumGold)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text("Novo Checklist", fontSize = 11.sp, color = FrostWhite, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Priority area
                item {
                    Text(
                        text = "ORDENS PRIORITÁRIAS",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MetallicSilver,
                            letterSpacing = 1.sp
                        )
                    )
                }

                if (priorityOrders.isEmpty()) {
                    item {
                        EmptyState(
                            title = "Sem OS Críticas",
                            subtitle = "Todas as vistorias e análises foram tratadas até o momento."
                        )
                    }
                } else {
                    items(priorityOrders) { order ->
                        OrderCard(
                            order = order,
                            onClick = { onNavigateToOrderDetails(order.id) }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
