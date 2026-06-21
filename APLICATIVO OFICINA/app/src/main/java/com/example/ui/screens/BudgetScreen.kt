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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.BudgetViewModel
import com.example.util.DocumentPrint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BudgetScreen(
    orderId: String,
    viewModel: BudgetViewModel,
    onNavigateBack: () -> Unit,
    onBudgetSubmitted: () -> Unit,
    onBudgetSaved: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val budget by viewModel.budget.collectAsState()
    val orderNumber by viewModel.orderNumber.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    val error by viewModel.error.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val products by viewModel.products.collectAsState()
    val productSearchResults by viewModel.productSearchResults.collectAsState()
    val isSearchingProducts by viewModel.isSearchingProducts.collectAsState()
    val serviceSearchResults by viewModel.serviceSearchResults.collectAsState()
    val isSearchingServices by viewModel.isSearchingServices.collectAsState()
    val isCreatingService by viewModel.isCreatingService.collectAsState()
    val serviceCatalog by viewModel.serviceCatalog.collectAsState()
    val employees by viewModel.employees.collectAsState()

    var productSearchQuery by remember { mutableStateOf("") }
    var serviceSearchQuery by remember { mutableStateOf("") }
    var manualServiceName by remember { mutableStateOf("") }
    var manualServicePrice by remember { mutableStateOf("") }
    var newServiceName by remember { mutableStateOf("") }
    var newServicePrice by remember { mutableStateOf("") }

    val snackbarHostState = remember { SnackbarHostState() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var printError by remember { mutableStateOf<String?>(null) }

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
        productSearchQuery = ""
        serviceSearchQuery = ""
        manualServiceName = ""
        manualServicePrice = ""
        newServiceName = ""
        newServicePrice = ""
    }

    LaunchedEffect(orderId) {
        resetAddForm()
        viewModel.loadBudget(orderId)
    }

    LaunchedEffect(showFormType) {
        when (showFormType) {
            BudgetItemType.PART -> viewModel.preparePartSheet()
            BudgetItemType.SERVICE -> viewModel.prepareServiceSheet()
            null -> Unit
        }
    }

    LaunchedEffect(actionError) {
        actionError?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearActionError()
        }
    }

    LaunchedEffect(showFormType, productSearchQuery) {
        if (showFormType == BudgetItemType.PART) {
            delay(300)
            viewModel.searchProducts(productSearchQuery)
        }
    }

    LaunchedEffect(showFormType, serviceSearchQuery) {
        if (showFormType == BudgetItemType.SERVICE) {
            delay(300)
            viewModel.searchServices(serviceSearchQuery)
        }
    }

    val displayedProducts = if (productSearchQuery.isBlank() && productSearchResults.isEmpty()) {
        products
    } else {
        productSearchResults
    }

    val displayedServices = if (serviceSearchQuery.isBlank() && serviceSearchResults.isEmpty()) {
        serviceCatalog
    } else {
        serviceSearchResults
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
                                HorizontalDivider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))
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
                        OutlinedButton(
                            onClick = {
                                val quoteId = loadedBudget.quoteId
                                if (quoteId.isNullOrBlank()) {
                                    printError = "Salve o rascunho antes de gerar o PDF."
                                    return@OutlinedButton
                                }
                                scope.launch {
                                    printError = null
                                    try {
                                        DocumentPrint.printQuote(context, quoteId)
                                    } catch (e: Exception) {
                                        printError = e.message ?: "Falha ao gerar PDF"
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !isSaving,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = FrostWhite),
                            border = BorderStroke(1.dp, PremiumGold),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = PremiumGold)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("PDF / Imprimir orçamento", fontWeight = FontWeight.Bold)
                        }
                        printError?.let { message ->
                            Text(text = message, color = DangerRed, fontSize = 12.sp)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    viewModel.saveBudgetDraft(orderId, onSaved = onBudgetSaved)
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
                    Text("Busque e toque na peça para adicionar ao orçamento:", color = MetallicSilver, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = productSearchQuery,
                        onValueChange = { productSearchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Buscar por nome, código ou local...", color = MetallicSilver) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = CrimsonRed) },
                        trailingIcon = {
                            VoiceTextFieldTrailingIcon(
                                value = productSearchQuery,
                                onValueChange = { productSearchQuery = it },
                            )
                        },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = FrostWhite,
                            unfocusedTextColor = FrostWhite,
                            focusedBorderColor = CrimsonRed,
                            unfocusedBorderColor = Graphite,
                        ),
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Quantidade por toque:", color = FrostWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
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

                    Spacer(modifier = Modifier.height(8.dp))

                    if (isSearchingProducts) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = CrimsonRed,
                            trackColor = Graphite,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    if (displayedProducts.isEmpty() && !isSearchingProducts) {
                        EmptyState(
                            title = "Nenhuma peça encontrada",
                            subtitle = "Cadastre produtos no estoque ou ajuste a busca.",
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = { viewModel.refreshCatalogs() }) {
                            Text("Tentar novamente", color = PremiumGold)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 360.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            items(displayedProducts, key = { it.id }) { prod ->
                                val isCurrent = selectedProduct?.id == prod.id
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(if (isCurrent) CrimsonRed.copy(alpha = 0.15f) else Color.Transparent)
                                        .border(1.dp, if (isCurrent) CrimsonRed else Graphite, RoundedCornerShape(4.dp))
                                        .clickable {
                                            selectedProduct = prod
                                            viewModel.addPartToBudget(orderId, prod, partQty)
                                        }
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(prod.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                        Text(
                                            "Cód: ${prod.code} • Disp.: ${prod.availableQty} un",
                                            color = MetallicSilver,
                                            fontSize = 11.sp,
                                        )
                                    }
                                    Text(formatCurrency(prod.price), color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    AppButton(
                        text = "Concluir",
                        onClick = { resetAddForm() },
                    )
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 560.dp)
                            .verticalScroll(rememberScrollState()),
                    ) {
                        Text("Busque no catálogo ou use manual/outro:", color = MetallicSilver, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = serviceSearchQuery,
                            onValueChange = { serviceSearchQuery = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Buscar serviço...", color = MetallicSilver) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = PremiumGold) },
                            trailingIcon = {
                                VoiceTextFieldTrailingIcon(
                                    value = serviceSearchQuery,
                                    onValueChange = { serviceSearchQuery = it },
                                )
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FrostWhite,
                                unfocusedTextColor = FrostWhite,
                                focusedBorderColor = PremiumGold,
                                unfocusedBorderColor = Graphite,
                            ),
                        )

                        if (isSearchingServices) {
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                modifier = Modifier.fillMaxWidth(),
                                color = PremiumGold,
                                trackColor = Graphite,
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        if (displayedServices.isEmpty() && !isSearchingServices) {
                            EmptyState(
                                title = "Nenhum serviço encontrado",
                                subtitle = "Cadastre abaixo ou use manual/outro.",
                            )
                        } else {
                            displayedServices.forEach { serv ->
                                val isCurrent = selectedServiceCatalog?.id == serv.id
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(if (isCurrent) PremiumGold.copy(alpha = 0.15f) else Color.Transparent)
                                        .border(1.dp, if (isCurrent) PremiumGold else Graphite, RoundedCornerShape(4.dp))
                                        .clickable {
                                            selectedServiceCatalog = serv
                                            manualServiceName = ""
                                            manualServicePrice = ""
                                        }
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(serv.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                        Text("Ref: ${serv.code}", color = MetallicSilver, fontSize = 11.sp)
                                    }
                                    Text(formatCurrency(serv.price), color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                            }
                        }

                        HorizontalDivider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))

                        Text("Manual / outro", color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = manualServiceName,
                            onValueChange = {
                                manualServiceName = it
                                if (it.isNotBlank()) selectedServiceCatalog = null
                            },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Descrição do serviço", color = MetallicSilver) },
                            trailingIcon = {
                                VoiceTextFieldTrailingIcon(
                                    value = manualServiceName,
                                    onValueChange = {
                                        manualServiceName = it
                                        if (it.isNotBlank()) selectedServiceCatalog = null
                                    },
                                )
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FrostWhite,
                                unfocusedTextColor = FrostWhite,
                                focusedBorderColor = PremiumGold,
                                unfocusedBorderColor = Graphite,
                            ),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = manualServicePrice,
                            onValueChange = { manualServicePrice = it.filter { ch -> ch.isDigit() || ch == ',' || ch == '.' } },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Valor (R$)", color = MetallicSilver) },
                            trailingIcon = {
                                VoiceTextFieldTrailingIcon(
                                    value = manualServicePrice,
                                    append = false,
                                    onValueChange = {
                                        manualServicePrice = it.filter { ch -> ch.isDigit() || ch == ',' || ch == '.' }
                                    },
                                )
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FrostWhite,
                                unfocusedTextColor = FrostWhite,
                                focusedBorderColor = PremiumGold,
                                unfocusedBorderColor = Graphite,
                            ),
                        )

                        HorizontalDivider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))

                        Text("Cadastrar novo serviço", color = PremiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = newServiceName,
                            onValueChange = { newServiceName = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Nome do serviço", color = MetallicSilver) },
                            trailingIcon = {
                                VoiceTextFieldTrailingIcon(
                                    value = newServiceName,
                                    onValueChange = { newServiceName = it },
                                )
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FrostWhite,
                                unfocusedTextColor = FrostWhite,
                                focusedBorderColor = PremiumGold,
                                unfocusedBorderColor = Graphite,
                            ),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = newServicePrice,
                            onValueChange = { newServicePrice = it.filter { ch -> ch.isDigit() || ch == ',' || ch == '.' } },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Preço padrão (R$)", color = MetallicSilver) },
                            trailingIcon = {
                                VoiceTextFieldTrailingIcon(
                                    value = newServicePrice,
                                    append = false,
                                    onValueChange = {
                                        newServicePrice = it.filter { ch -> ch.isDigit() || ch == ',' || ch == '.' }
                                    },
                                )
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = FrostWhite,
                                unfocusedTextColor = FrostWhite,
                                focusedBorderColor = PremiumGold,
                                unfocusedBorderColor = Graphite,
                            ),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                val price = parseCurrencyInput(newServicePrice)
                                viewModel.createServiceCatalog(newServiceName, price) { created ->
                                    selectedServiceCatalog = created
                                    manualServiceName = ""
                                    manualServicePrice = ""
                                    newServiceName = ""
                                    newServicePrice = ""
                                }
                            },
                            enabled = !isCreatingService && newServiceName.isNotBlank(),
                            modifier = Modifier.fillMaxWidth(),
                            border = BorderStroke(1.dp, PremiumGold),
                        ) {
                            if (isCreatingService) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), color = PremiumGold, strokeWidth = 2.dp)
                            } else {
                                Text("Salvar no catálogo e selecionar", color = PremiumGold)
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text("Executor (opcional):", color = MetallicSilver, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(4.dp))

                        if (employees.isEmpty()) {
                            Text("Nenhum mecânico carregado.", color = MetallicSilver, fontSize = 12.sp)
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
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(worker.name, fontWeight = FontWeight.Bold, color = FrostWhite, fontSize = 13.sp)
                                    Text(worker.role, color = MetallicSilver, fontSize = 11.sp)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        val manualPrice = parseCurrencyInput(manualServicePrice)
                        val canAddCatalog = selectedServiceCatalog != null
                        val canAddManual = manualServiceName.isNotBlank() && manualPrice > 0

                        AppButton(
                            text = "Adicionar Mão de Obra",
                            onClick = {
                                when {
                                    canAddCatalog -> {
                                        val serv = selectedServiceCatalog!!
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
                                                executorName = selectedExecutor?.name,
                                            ),
                                        )
                                        resetAddForm()
                                    }
                                    canAddManual -> {
                                        viewModel.addManualServiceToBudget(
                                            orderId,
                                            manualServiceName,
                                            manualPrice,
                                            selectedExecutor,
                                        )
                                        resetAddForm()
                                    }
                                }
                            },
                            enabled = canAddCatalog || canAddManual,
                        )
                    }
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
    return String.format(Locale.forLanguageTag("pt-BR"), "R$ %.2f", value)
}

private fun parseCurrencyInput(raw: String): Double {
    val normalized = raw.trim().replace(",", ".")
    return normalized.toDoubleOrNull() ?: 0.0
}
