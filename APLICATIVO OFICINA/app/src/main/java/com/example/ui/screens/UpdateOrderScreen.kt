package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Order
import com.example.data.model.OrderStatus
import com.example.ui.components.AppButton
import com.example.ui.components.InputField
import com.example.ui.components.LoadingScreen
import com.example.ui.components.VehicleSummaryCard
import com.example.ui.theme.*
import com.example.ui.viewmodel.OrderDetailsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdateOrderScreen(
    orderId: String,
    viewModel: OrderDetailsViewModel,
    onNavigateBack: () -> Unit,
    onStatusUpdated: () -> Unit,
    modifier: Modifier = Modifier
) {
    val order by viewModel.order.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var selectedStatus by remember { mutableStateOf(OrderStatus.RECEIVED) }
    var diagnosisText by remember { mutableStateOf("") }
    var customerNotesText by remember { mutableStateOf("") }

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    LaunchedEffect(order) {
        order?.let {
            selectedStatus = it.status
            diagnosisText = it.technicalDiagnostic
            customerNotesText = it.customerVisibleNotes
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "STATUS DA OS #${order?.displayNumber ?: orderId}",
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
        } else {
            order?.let { activeOrder ->
                LazyColumn(
                    modifier = Modifier
                        .padding(innerPadding)
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(top = 12.dp, bottom = 48.dp)
                ) {
                    item {
                        VehicleSummaryCard(order = activeOrder)
                    }

                    // Instruction Header
                    item {
                        Text(
                            text = "SELECIONE O NOVO STATUS",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = MetallicSilver)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Escolha o estágio operacional do veículo. Isso atualiza o painel do supervisor e o ERP web.",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                        )
                    }

                    // Dynamic selection statuses (Custom selectable list)
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            OrderStatus.values().forEach { osStatus ->
                                val isSelected = osStatus == selectedStatus
                                val activeBorderColor = if (isSelected) CrimsonRed else Graphite
                                val activeBgColor = if (isSelected) CrimsonRed.copy(alpha = 0.15f) else DarkSurface
                                val activeTextColor = if (isSelected) CrimsonRed else FrostWhite

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(activeBgColor)
                                        .border(1.dp, activeBorderColor, RoundedCornerShape(8.dp))
                                        .clickable { selectedStatus = osStatus }
                                        .padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(if (isSelected) CrimsonRed else MetallicSilver, RoundedCornerShape(4.dp))
                                        )
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text(
                                            text = osStatus.label,
                                            style = MaterialTheme.typography.bodyMedium.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = activeTextColor
                                            )
                                        )
                                    }
                                    if (isSelected) {
                                        Icon(imageVector = Icons.Default.Check, contentDescription = "Selecionado", tint = CrimsonRed)
                                    }
                                }
                            }
                        }
                    }

                    // Diagnóstico técnico
                    item {
                        Text(
                            text = "DIAGNÓSTICO TÉCNICO",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        InputField(
                            value = diagnosisText,
                            onValueChange = { diagnosisText = it },
                            label = "Diagnóstico interno da oficina",
                            singleLine = false,
                            minLines = 3,
                        )
                    }

                    // Observações visíveis ao cliente
                    item {
                        Text(
                            text = "OBSERVAÇÕES PARA O CLIENTE",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = SuccessGreen)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Texto que o cliente vê no portal e nas comunicações.",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        InputField(
                            value = customerNotesText,
                            onValueChange = { customerNotesText = it },
                            label = "O que o cliente pode ver",
                            singleLine = false,
                            minLines = 3,
                        )
                    }

                    // Action buttons
                    item {
                        AppButton(
                            text = "Gravar Atualização de Status",
                            onClick = {
                                viewModel.transitionStatus(
                                    orderId = activeOrder.id,
                                    newStatus = selectedStatus,
                                    diagnosis = diagnosisText,
                                    customerVisibleNotes = customerNotesText,
                                    onDone = onStatusUpdated
                                )
                            },
                            isSecondary = false
                        )
                    }
                }
            }
        }
    }
}
