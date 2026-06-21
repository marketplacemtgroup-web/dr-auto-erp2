package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.navigation.Screen
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.OrderDetailsViewModel
import com.example.util.DocumentPrint
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailsScreen(
    orderId: String,
    viewModel: OrderDetailsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToPhotoChecklist: (String) -> Unit,
    onNavigateToBudget: (String) -> Unit,
    onNavigateToUpdateOrder: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var printError by remember { mutableStateOf<String?>(null) }
    val order by viewModel.order.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "OS #${order?.displayNumber ?: orderId}",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = FrostWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface)
            )
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        if (isLoading) {
            LoadingScreen(modifier = Modifier.padding(innerPadding))
        } else if (error != null) {
            Box(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                ErrorState(message = error ?: "Desconhecido", onRetry = { viewModel.loadOrder(orderId) })
            }
        } else {
            order?.let { activeOrder ->
                LazyColumn(
                    modifier = Modifier
                        .padding(innerPadding)
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(top = 12.dp, bottom = 32.dp)
                ) {
                    // Vehicle summary box first
                    item {
                        VehicleSummaryCard(order = activeOrder)
                    }

                    // Operational Actions block (Primary trigger buttons)
                    item {
                        Text(
                            text = "AÇÕES PRINCIPAIS",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = MetallicSilver)
                        )
                    }

                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Technical checklist button
                            AppButton(
                                text = "Checklist Fotográfico",
                                onClick = { onNavigateToPhotoChecklist(activeOrder.id) },
                                isSecondary = false
                            )

                            // Budget engine button
                            AppButton(
                                text = "Criar / Editar Orçamento",
                                onClick = { onNavigateToBudget(activeOrder.id) },
                                isSecondary = true
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // WhatsApp communications shortcut
                                Button(
                                    onClick = {
                                        val url = "https://api.whatsapp.com/send?phone=55${activeOrder.clientPhone}&text=Ola%2C%20veiculo%20esta%20analisado%20na%20Beto%20Mecanica."
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        context.startActivity(intent)
                                    },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                                    border = BorderStroke(1.dp, Graphite),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.AutoMirrored.Filled.Message, contentDescription = "WhatsApp", tint = SuccessGreen, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("WhatsApp", color = FrostWhite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                // Traditional Call shortcuts
                                Button(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${activeOrder.clientPhone}"))
                                        context.startActivity(intent)
                                    },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = DarkSurface),
                                    border = BorderStroke(1.dp, Graphite),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Phone, contentDescription = "Ligar", tint = PremiumGold, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Ligar", color = FrostWhite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            // Update order progress status
                            AppButton(
                                text = "Atualizar Status da OS",
                                onClick = { onNavigateToUpdateOrder(activeOrder.id) },
                                isSecondary = true
                            )

                            OutlinedButton(
                                onClick = {
                                    scope.launch {
                                        printError = null
                                        try {
                                            DocumentPrint.printServiceOrder(context, activeOrder.id)
                                        } catch (e: Exception) {
                                            printError = e.message ?: "Falha ao gerar PDF"
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = FrostWhite),
                                border = BorderStroke(1.dp, PremiumGold),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = PremiumGold)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("PDF / Imprimir OS", fontWeight = FontWeight.Bold)
                            }

                            printError?.let { message ->
                                Text(
                                    text = message,
                                    color = DangerRed,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                        }
                    }

                    // Complaint and diagnostics
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, Graphite)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "QUEIXA DO CLIENTE",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = CrimsonRed)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = activeOrder.clientComplaint,
                                    style = MaterialTheme.typography.bodyMedium.copy(color = FrostWhite)
                                )

                                if (activeOrder.technicalDiagnostic.isNotEmpty()) {
                                    HorizontalDivider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))
                                    Text(
                                        text = "DIAGNÓSTICO TÉCNICO",
                                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = activeOrder.technicalDiagnostic,
                                        style = MaterialTheme.typography.bodyMedium.copy(color = FrostWhite)
                                    )
                                }
                            }
                        }
                    }

                    // Timeline chronological log
                    item {
                        Text(
                            text = "HISTÓRICO DE ALTERAÇÕES",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = MetallicSilver)
                        )
                    }

                    if (activeOrder.history.isEmpty()) {
                        item {
                            Text(
                                text = "Nenhum histórico registrado para esta ordem.",
                                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                            )
                        }
                    } else {
                        itemsIndexed(activeOrder.history) { index, event ->
                            TimelineItem(
                                event = event,
                                isLast = index == activeOrder.history.size - 1
                            )
                        }
                    }
                }
            }
        }
    }
}
