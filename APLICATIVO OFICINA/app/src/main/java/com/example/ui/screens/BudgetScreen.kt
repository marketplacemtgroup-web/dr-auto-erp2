package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.BudgetViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BudgetScreen(
    orderId: String,
    viewModel: BudgetViewModel,
    onNavigateBack: () -> Unit,
    onBudgetSubmitted: () -> Unit,
    modifier: Modifier = Modifier
) {
    val budget by viewModel.budget.collectAsState()
    val orderNumber by viewModel.orderNumber.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    val error by viewModel.error.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val products by viewModel.products.collectAsState()
    val serviceCatalog by viewModel.serviceCatalog.collectAsState()
    val employees by viewModel.employees.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Forms to add item
    var showFormType by remember { mutableStateOf<BudgetItemType?>(null) } // PART, SERVICE or null

    // For Part addition
    var selectedProduct by remember { mutableStateOf<Product?>(null) }
    var partQty by remember { mutableStateOf(1) }

    // For Service addition
    var selectedServiceCatalog by remember { mutableStateOf<ServiceCatalog?>(null) }
    var selectedExecutor by remember { mutableStateOf<Employee?>(null) }

    fun resetAddForm() {
        showFormType = null
        selectedProduct = null
        selectedServiceCatalog = null
        selectedExecutor = null
        partQty = 1
    }

    LaunchedEffect(orderId) {
        resetAddForm()
        viewModel.loadBudget(orderId)
    }

    LaunchedEffect(actionError) {
        actionError?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearActionError()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "ORÇAMENTO INTERNO",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                        )
                        Text(
                            text = "OS #${orderNumber.ifBlank { orderId }} • Configuração de Preços",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Voltar", tint = FrostWhite)
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
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize(), contentAlignment = Alignment.Center) {
                ErrorState(message = error ?: "Desconhecido", onRetry = { viewModel.loadBudget(orderId) })
            }
        } else {
            val loadedBudget = budget ?: Budget(orderId = orderId)

            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(top = 12.dp, bottom = 120.dp)
                ) {
                    // BUDGET MATRIX DYNAMIC TOTALS
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, CrimsonRed)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "RESUMO FINANCEIRO",
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = CrimsonRed)
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Peças & Componentes:", color = MetallicSilver)
                                    Text(
                                        formatCurrency(loadedBudget.totalParts),
                                        color = FrostWhite,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Mão de Obra / Serviços:", color = MetallicSilver)
                                    Text(
                                        formatCurrency(loadedBudget.totalServices),
                                        color = FrostWhite,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Divider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "TOTAL GERAL:",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                                    )
                                    Text(
                                        formatCurrency(loadedBudget.grandTotal),
                                        style = MaterialTheme.typography.titleLarge.copy(
                                            fontWeight = FontWeight.Black,
                                            color = PremiumGold
                                        )
                                    )
                                }
                            }
                        }
                    }

                    // ADD BUTTONS
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { showFormType = BudgetItemType.PART },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = FrostWhite),
                                border = BorderStroke(1.dp, Graphite),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = "Peça", tint = CrimsonRed)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Inserir Peça", color = FrostWhite)
                            }

                            OutlinedButton(
                                onClick = { showFormType = BudgetItemType.SERVICE },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = FrostWhite),
                                border = BorderStroke(1.dp, Graphite),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.AddCircle, contentDescription = "Mão de Obra", tint = PremiumGold)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Mão de Obra", color = FrostWhite)
                            }
                        }
                    }

                    // ITEMS LIST TABLE
                    item {
                        Text(
                            text = "RELAÇÃO DE ITENS LANÇADOS",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = MetallicSilver)
                        )
                    }

                    if (loadedBudget.items.isEmpty()) {
                        item {
                            EmptyState(
                                title = "Orçamento Vazio",
                                subtitle = "Nenhuma peça ou serviço adicioanda para esta rampa de reparo."
                            )
                        }
                    } else {
                        items(loadedBudget.items) { item ->
                            BudgetItemCard(
                                item = item,
                                onDelete = { viewModel.removeItemFromBudget(orderId, item.code, item.type) }
                            )
                        }
                    }
                }

                // SUBMIT CONTROL BOX
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    border = BorderStroke(1.dp, Graphite)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        AppButton(
                            text = "Enviar orçamento para o cliente",
                            onClick = {
                                viewModel.sendBudgetToClient(orderId, onBudgetSubmitted)
                            },
                            enabled = loadedBudget.items.isNotEmpty() && !isSaving,
                            isSecondary = false
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    viewModel.saveBudgetDraft(orderId, onBudgetSubmitted)
                                },
                                modifier = Modifier.weight(1f),
                                enabled = !isSaving,
                                colors = ButtonDefaults.buttonColors(containerColor = Graphite),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                if (isSaving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        color = FrostWhite,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text("SALVAR RASCUNHO", color = FrostWhite, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFormType != null) {
        ModalBottomSheet(
            onDismissRequest = { resetAddForm() },
            sheetState = sheetState,
            containerColor = DarkSurface,
            dragHandle = { BottomSheetDefaults.DragHandle(color = MetallicSilver) },
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
                    .padding(bottom = 32.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (showFormType == BudgetItemType.PART) "Lançar Peça no Orçamento" else "Lançar Mão de Obra",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                    )
                    IconButton(onClick = { resetAddForm() }) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Fechar", tint = FrostWhite)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (showFormType == BudgetItemType.PART) {
                    Text("Selecione o item do estoque:", color = MetallicSilver, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(6.dp))

                    if (products.isEmpty()) {
                        EmptyState(
                            title = "Nenhuma peça disponível",
                            subtitle = "Cadastre produtos no sistema ou verifique sua conexão com a API.",
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { viewModel.refreshCatalogs() }) {
                            Text("Tentar novamente", color = PremiumGold)
                        }
                    } else {
                        products.forEach { prod ->
                            val isCurrent = selectedProduct?.id == prod.id
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(if (isCurrent) CrimsonRed.copy(alpha = 0.15f) else Color.Transparent)
                                    .border(1.dp, if (isCurrent) CrimsonRed else Graphite, RoundedCornerShape(4.dp))
                                    .clickable { selectedProduct = prod }
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(prod.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                    Text("Cód: ${prod.code} • Estoque: ${prod.stockQty} un", color = MetallicSilver, fontSize = 11.sp)
                                }
                                Text(formatCurrency(prod.price), color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Quantidade desejada:", color = FrostWhite, fontWeight = FontWeight.SemiBold)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { if (partQty > 1) partQty-- }) {
                                Icon(Icons.Default.RemoveCircle, "Menos", tint = LightSilver)
                            }
                            Text(partQty.toString(), color = FrostWhite, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 12.dp))
                            IconButton(onClick = { partQty++ }) {
                                Icon(Icons.Default.AddCircle, "Mais", tint = CrimsonRed)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    AppButton(
                        text = "Adicionar Peça",
                        onClick = {
                            selectedProduct?.let { product ->
                                viewModel.addItemToBudget(
                                    orderId,
                                    BudgetItem(
                                        id = "item_${System.currentTimeMillis()}",
                                        type = BudgetItemType.PART,
                                        code = product.id,
                                        name = product.name,
                                        qty = partQty,
                                        unitPrice = product.price
                                    )
                                )
                                resetAddForm()
                            }
                        },
                        enabled = selectedProduct != null
                    )
                } else {
                    Text("Selecione o serviço do catálogo:", color = MetallicSilver, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(6.dp))

                    if (serviceCatalog.isEmpty()) {
                        EmptyState(
                            title = "Nenhum serviço disponível",
                            subtitle = "Cadastre serviços no catálogo ou verifique sua conexão com a API.",
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { viewModel.refreshCatalogs() }) {
                            Text("Tentar novamente", color = PremiumGold)
                        }
                    } else {
                        serviceCatalog.forEach { serv ->
                            val isCurrent = selectedServiceCatalog?.id == serv.id
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(if (isCurrent) PremiumGold.copy(alpha = 0.15f) else Color.Transparent)
                                    .border(1.dp, if (isCurrent) PremiumGold else Graphite, RoundedCornerShape(4.dp))
                                    .clickable { selectedServiceCatalog = serv }
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(serv.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                    Text("Mão de Obra Ref: ${serv.code}", color = MetallicSilver, fontSize = 11.sp)
                                }
                                Text(formatCurrency(serv.price), color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text("Selecione o mecânico executor:", color = MetallicSilver, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(4.dp))

                    if (employees.isEmpty()) {
                        EmptyState(
                            title = "Nenhum mecânico disponível",
                            subtitle = "Cadastre técnicos na equipe ou verifique sua conexão com a API.",
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { viewModel.refreshCatalogs() }) {
                            Text("Tentar novamente", color = PremiumGold)
                        }
                    } else {
                        employees.forEach { worker ->
                            val isCurrent = selectedExecutor?.id == worker.id
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(if (isCurrent) CrimsonRed.copy(alpha = 0.15f) else Color.Transparent)
                                    .border(1.dp, if (isCurrent) CrimsonRed else Graphite, RoundedCornerShape(4.dp))
                                    .clickable { selectedExecutor = worker }
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(worker.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                Text(worker.role, color = MetallicSilver, fontSize = 11.sp)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    AppButton(
                        text = "Adicionar Mão de Obra",
                        onClick = {
                            selectedServiceCatalog?.let { serv ->
                                viewModel.addItemToBudget(
                                    orderId,
                                    BudgetItem(
                                        id = "item_${System.currentTimeMillis()}",
                                        type = BudgetItemType.SERVICE,
                                        code = serv.id,
                                        name = serv.name,
                                        qty = 1,
                                        unitPrice = serv.price,
                                        executorId = selectedExecutor?.id,
                                        executorName = selectedExecutor?.name
                                    )
                                )
                                resetAddForm()
                            }
                        },
                        enabled = selectedServiceCatalog != null && selectedExecutor != null
                    )
                }
            }
        }
    }
}

@Composable
fun BudgetItemCard(
    item: BudgetItem,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (item.type == BudgetItemType.PART) Icons.Default.Settings else Icons.Default.Build,
                        contentDescription = "Item Type",
                        tint = if (item.type == BudgetItemType.PART) CrimsonRed else PremiumGold,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (item.type == BudgetItemType.PART) "PEÇA" else "SERVIÇO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (item.type == BudgetItemType.PART) CrimsonRed else PremiumGold
                        )
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                )

                // Service supervisor details
                if (item.type == BudgetItemType.SERVICE && item.executorName != null) {
                    Text(
                        text = "Executor: ${item.executorName}",
                        style = MaterialTheme.typography.bodySmall.copy(color = PremiumGold, fontWeight = FontWeight.Bold)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "${item.qty} un x ${formatCurrency(item.unitPrice)}",
                        style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                    )
                    Text(
                        text = "Subtotal: ${formatCurrency(item.total)}",
                        style = MaterialTheme.typography.bodySmall.copy(color = LightSilver, fontWeight = FontWeight.Bold)
                    )
                }
            }

            IconButton(onClick = onDelete) {
                Icon(imageVector = Icons.Default.Delete, contentDescription = "Deletar", tint = DangerRed)
            }
        }
    }
}

fun formatCurrency(value: Double): String {
    return String.format(Locale("pt", "BR"), "R$ %.2f", value)
}
