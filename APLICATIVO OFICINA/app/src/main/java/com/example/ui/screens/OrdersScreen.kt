package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.OrdersViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    viewModel: OrdersViewModel,
    preselectedFilter: String = "Todas",
    onNavigateToOrderDetails: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val orders by viewModel.orders.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val currentFilter by viewModel.currentFilter.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    val lastApiError by viewModel.lastApiError.collectAsState()

    // Filter categories requested
    val filtersList = listOf("Todas", "Checklist", "Em análise", "Aguardando aprovação", "Em execução", "Finalizadas")

    LaunchedEffect(preselectedFilter) {
        if (preselectedFilter != "Todas") {
            viewModel.updateFilter(preselectedFilter)
        } else {
            viewModel.loadOrders()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "ORDENS DE SERVIÇO",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold, color = FrostWhite)
                        )
                        Text(
                            text = "Central de Operação Beto Mecânica",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface)
            )
        },
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Simulated Warning Banner
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
                        Icon(imageVector = Icons.Default.FilterList, contentDescription = "Active Filter", tint = PremiumGold)
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "MODO OFFLINE COOPERAÇÃO",
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                            )
                            Text(
                                text = "Buscando dados no cache local do dispositivo.",
                                style = MaterialTheme.typography.bodySmall.copy(color = LightSilver)
                            )
                        }
                        IconButton(onClick = { viewModel.clearLastError() }) {
                            Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = LightSilver)
                        }
                    }
                }
            }

            // Search Bar Input
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                InputField(
                    value = searchQuery,
                    onValueChange = { viewModel.updateSearch(it) },
                    label = "Pesquisar por cliente, placa, veículo ou OS...",
                    leadingIcon = {
                        Icon(imageVector = Icons.Default.Search, contentDescription = "Buscar", tint = CrimsonRed)
                    }
                )
            }

            // Scrollable filter tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                filtersList.forEach { filter ->
                    val isSelected = filter == currentFilter
                    val backgroundTabColor = if (isSelected) CrimsonRed else DarkSurface
                    val textSelectedColor = if (isSelected) FrostWhite else MetallicSilver
                    val borderTabColor = if (isSelected) CrimsonRed else Graphite

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(backgroundTabColor)
                            .border(1.dp, borderTabColor, RoundedCornerShape(20.dp))
                            .clickable { viewModel.updateFilter(filter) }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = filter,
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                color = textSelectedColor,
                                fontSize = 12.sp
                            )
                        )
                    }
                }
            }

            // Orders list
            if (isLoading) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = CrimsonRed)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    if (orders.isEmpty()) {
                        item {
                            EmptyState(
                                title = "Nenhuma Ordem de Serviço",
                                subtitle = "Nenhum registro atende aos critérios de busca ou filtros ativos."
                            )
                        }
                    } else {
                        items(orders) { order ->
                            OrderCard(
                                order = order,
                                onClick = { onNavigateToOrderDetails(order.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}
