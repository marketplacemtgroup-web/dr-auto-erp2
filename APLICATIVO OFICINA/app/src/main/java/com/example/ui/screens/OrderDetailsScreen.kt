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
import com.example.util.ChecklistLocalStore
import com.example.util.DocumentPrint
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailsScreen(
    orderId: String,
    viewModel: OrderDetailsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToPhotoChecklist: (String) -> Unit,
    onNavigateToWorkPhotos: (String) -> Unit,
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
    val isSavingNotes by viewModel.isSavingNotes.collectAsState()
    val notesMessage by viewModel.notesMessage.collectAsState()

    var complaintText by remember { mutableStateOf("") }
    var diagnosisText by remember { mutableStateOf("") }
    var customerNotesText by remember { mutableStateOf("") }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(orderId) {
        viewModel.loadOrder(context, orderId)
    }

    LaunchedEffect(order) {
        order?.let {
            complaintText = it.clientComplaint
            diagnosisText = it.technicalDiagnostic
            customerNotesText = it.customerVisibleNotes
        }
    }

    LaunchedEffect(notesMessage) {
        notesMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearNotesMessage()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
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
                            val isOrderClosed = ChecklistLocalStore.isOrderClosed(activeOrder.status)

                            if (!isOrderClosed) {
                                AppButton(
                                    text = "Checklist Fotográfico",
                                    onClick = { onNavigateToPhotoChecklist(activeOrder.id) },
                                    isSecondary = false,
                                )

                                Button(
                                    onClick = { onNavigateToWorkPhotos(activeOrder.id) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                                    shape = RoundedCornerShape(8.dp),
                                ) {
                                    Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = FrostWhite)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Fotos do Serviço", color = FrostWhite, fontWeight = FontWeight.Bold)
                                }
                            }

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

                    // Queixa, diagnóstico e observações ao cliente (editáveis)
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, Graphite)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text(
                                    text = "ATENDIMENTO E OBSERVAÇÕES",
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = MetallicSilver,
                                    ),
                                )

                                Text(
                                    text = "QUEIXA DO CLIENTE",
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = CrimsonRed,
                                    ),
                                )
                                InputField(
                                    value = complaintText,
                                    onValueChange = { complaintText = it },
                                    label = "Relato inicial do cliente",
                                    singleLine = false,
                                    minLines = 2,
                                )

                                Text(
                                    text = "DIAGNÓSTICO TÉCNICO",
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = PremiumGold,
                                    ),
                                )
                                InputField(
                                    value = diagnosisText,
                                    onValueChange = { diagnosisText = it },
                                    label = "Diagnóstico interno da oficina",
                                    singleLine = false,
                                    minLines = 3,
                                )

                                Text(
                                    text = "OBSERVAÇÕES PARA O CLIENTE",
                                    style = MaterialTheme.typography.labelMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = SuccessGreen,
                                    ),
                                )
                                Text(
                                    text = "Texto visível ao cliente no portal e comunicações.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
                                )
                                InputField(
                                    value = customerNotesText,
                                    onValueChange = { customerNotesText = it },
                                    label = "O que o cliente pode ver",
                                    singleLine = false,
                                    minLines = 3,
                                )

                                AppButton(
                                    text = if (isSavingNotes) "Salvando..." else "Salvar observações",
                                    onClick = {
                                        viewModel.saveOrderNotes(
                                            orderId = activeOrder.id,
                                            complaint = complaintText,
                                            diagnosis = diagnosisText,
                                            customerVisibleNotes = customerNotesText,
                                        )
                                    },
                                    enabled = !isSavingNotes,
                                    isSecondary = true,
                                )
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
