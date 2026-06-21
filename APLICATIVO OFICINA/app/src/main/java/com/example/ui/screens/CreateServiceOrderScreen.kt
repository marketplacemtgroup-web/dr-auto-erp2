package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.VehicleListItem
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.CreateOsStep
import com.example.ui.viewmodel.CreateServiceOrderViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateServiceOrderScreen(
    viewModel: CreateServiceOrderViewModel,
    onNavigateBack: () -> Unit,
    onOrderCreated: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val step by viewModel.step.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val vehicles by viewModel.vehicles.collectAsState()
    val selectedVehicle by viewModel.selectedVehicle.collectAsState()
    val isSearching by viewModel.isSearching.collectAsState()
    val isSubmitting by viewModel.isSubmitting.collectAsState()
    val error by viewModel.error.collectAsState()

    val customerName by viewModel.customerName.collectAsState()
    val customerDocument by viewModel.customerDocument.collectAsState()
    val customerPhone by viewModel.customerPhone.collectAsState()
    val customerWhatsapp by viewModel.customerWhatsapp.collectAsState()

    val vehiclePlate by viewModel.vehiclePlate.collectAsState()
    val vehicleBrand by viewModel.vehicleBrand.collectAsState()
    val vehicleModel by viewModel.vehicleModel.collectAsState()
    val vehicleYear by viewModel.vehicleYear.collectAsState()
    val vehicleColor by viewModel.vehicleColor.collectAsState()
    val complaint by viewModel.complaint.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    val title = when (step) {
        CreateOsStep.SEARCH -> "Nova OS — Buscar veículo"
        CreateOsStep.NEW_CUSTOMER -> "Cadastrar cliente"
        CreateOsStep.NEW_VEHICLE -> "Cadastrar veículo"
        CreateOsStep.CONFIRM -> "Confirmar ordem de serviço"
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = FrostWhite,
                        ),
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        when (step) {
                            CreateOsStep.SEARCH -> onNavigateBack()
                            CreateOsStep.NEW_CUSTOMER -> viewModel.goBackToSearch()
                            CreateOsStep.NEW_VEHICLE -> viewModel.goBackFromVehicleStep()
                            CreateOsStep.CONFIRM -> viewModel.goBackFromConfirm()
                        }
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Voltar",
                            tint = FrostWhite,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface),
            )
        },
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp),
        ) {
            when (step) {
                CreateOsStep.SEARCH -> SearchVehicleStep(
                    searchQuery = searchQuery,
                    onSearchChange = viewModel::updateSearch,
                    vehicles = vehicles,
                    isSearching = isSearching,
                    onSelectVehicle = viewModel::selectVehicle,
                    onNewCustomer = viewModel::startNewCustomerFlow,
                )

                CreateOsStep.NEW_CUSTOMER -> NewCustomerStep(
                    name = customerName,
                    document = customerDocument,
                    phone = customerPhone,
                    whatsapp = customerWhatsapp,
                    onNameChange = viewModel::updateCustomerName,
                    onDocumentChange = viewModel::updateCustomerDocument,
                    onPhoneChange = viewModel::updateCustomerPhone,
                    onWhatsappChange = viewModel::updateCustomerWhatsapp,
                    isSubmitting = isSubmitting,
                    onContinue = { viewModel.saveCustomer() },
                )

                CreateOsStep.NEW_VEHICLE -> NewVehicleStep(
                    plate = vehiclePlate,
                    brand = vehicleBrand,
                    model = vehicleModel,
                    year = vehicleYear,
                    color = vehicleColor,
                    onPlateChange = viewModel::updateVehiclePlate,
                    onBrandChange = viewModel::updateVehicleBrand,
                    onModelChange = viewModel::updateVehicleModel,
                    onYearChange = viewModel::updateVehicleYear,
                    onColorChange = viewModel::updateVehicleColor,
                    isSubmitting = isSubmitting,
                    onContinue = { viewModel.saveVehicle() },
                )

                CreateOsStep.CONFIRM -> ConfirmOrderStep(
                    vehicle = selectedVehicle,
                    complaint = complaint,
                    onComplaintChange = viewModel::updateComplaint,
                    isSubmitting = isSubmitting,
                    onCreate = { viewModel.createOrder(onOrderCreated) },
                )
            }
        }
    }
}

@Composable
private fun SearchVehicleStep(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    vehicles: List<VehicleListItem>,
    isSearching: Boolean,
    onSelectVehicle: (VehicleListItem) -> Unit,
    onNewCustomer: () -> Unit,
) {
    InputField(
        value = searchQuery,
        onValueChange = onSearchChange,
        label = "Digite o nome do cliente ou a placa...",
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null, tint = CrimsonRed)
        },
    )

    Spacer(modifier = Modifier.height(12.dp))

    OutlinedButton(
        onClick = onNewCustomer,
        modifier = Modifier.fillMaxWidth(),
        border = BorderStroke(1.dp, PremiumGold),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = PremiumGold),
    ) {
        Icon(Icons.Default.Add, contentDescription = null, tint = PremiumGold)
        Spacer(modifier = Modifier.width(8.dp))
        Text("Cliente ou veículo não encontrado — cadastrar")
    }

    Spacer(modifier = Modifier.height(16.dp))

    if (isSearching) {
        LinearProgressIndicator(
            modifier = Modifier.fillMaxWidth(),
            color = CrimsonRed,
            trackColor = Graphite,
        )
        Spacer(modifier = Modifier.height(8.dp))
    }

    Text(
        text = "Selecione o veículo",
        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = MetallicSilver),
    )
    Spacer(modifier = Modifier.height(8.dp))

    if (vehicles.isEmpty() && !isSearching) {
        EmptyState(
            title = "Nenhum veículo encontrado",
            subtitle = "Ajuste a busca ou cadastre um novo cliente e veículo.",
        )
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(vehicles) { vehicle ->
                VehicleSearchResultCard(vehicle = vehicle, onClick = { onSelectVehicle(vehicle) })
            }
        }
    }
}

@Composable
private fun VehicleSearchResultCard(
    vehicle: VehicleListItem,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite),
        shape = RoundedCornerShape(10.dp),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = CrimsonRed)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = vehicle.customerName,
                    fontWeight = FontWeight.Bold,
                    color = FrostWhite,
                    fontSize = 14.sp,
                )
                Text(
                    text = vehicle.plate,
                    color = PremiumGold,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                )
                val modelLabel = listOfNotNull(vehicle.brand, vehicle.model).joinToString(" ")
                if (modelLabel.isNotBlank()) {
                    Text(text = modelLabel, color = MetallicSilver, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun NewCustomerStep(
    name: String,
    document: String,
    phone: String,
    whatsapp: String,
    onNameChange: (String) -> Unit,
    onDocumentChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onWhatsappChange: (String) -> Unit,
    isSubmitting: Boolean,
    onContinue: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Dados do cliente",
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold),
        )
        InputField(value = name, onValueChange = onNameChange, label = "Nome *")
        InputField(value = document, onValueChange = onDocumentChange, label = "CPF/CNPJ")
        InputField(value = phone, onValueChange = onPhoneChange, label = "Telefone")
        InputField(value = whatsapp, onValueChange = onWhatsappChange, label = "WhatsApp")
        Spacer(modifier = Modifier.height(8.dp))
        AppButton(
            text = if (isSubmitting) "Salvando..." else "Continuar para veículo",
            onClick = onContinue,
            enabled = !isSubmitting && name.isNotBlank(),
        )
    }
}

@Composable
private fun NewVehicleStep(
    plate: String,
    brand: String,
    model: String,
    year: String,
    color: String,
    onPlateChange: (String) -> Unit,
    onBrandChange: (String) -> Unit,
    onModelChange: (String) -> Unit,
    onYearChange: (String) -> Unit,
    onColorChange: (String) -> Unit,
    isSubmitting: Boolean,
    onContinue: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Dados do veículo",
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold),
        )
        InputField(value = plate, onValueChange = onPlateChange, label = "Placa *")
        InputField(value = brand, onValueChange = onBrandChange, label = "Marca")
        InputField(value = model, onValueChange = onModelChange, label = "Modelo")
        InputField(value = year, onValueChange = onYearChange, label = "Ano")
        InputField(value = color, onValueChange = onColorChange, label = "Cor")
        Spacer(modifier = Modifier.height(8.dp))
        AppButton(
            text = if (isSubmitting) "Salvando..." else "Continuar",
            onClick = onContinue,
            enabled = !isSubmitting && plate.isNotBlank(),
        )
    }
}

@Composable
private fun ConfirmOrderStep(
    vehicle: VehicleListItem?,
    complaint: String,
    onComplaintChange: (String) -> Unit,
    isSubmitting: Boolean,
    onCreate: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (vehicle != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                border = BorderStroke(1.dp, Graphite),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Cliente", color = MetallicSilver, fontSize = 12.sp)
                    Text(vehicle.customerName, color = FrostWhite, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Veículo", color = MetallicSilver, fontSize = 12.sp)
                    Text(vehicle.plate, color = PremiumGold, fontWeight = FontWeight.Bold)
                    val modelLabel = listOfNotNull(vehicle.brand, vehicle.model).joinToString(" ")
                    if (modelLabel.isNotBlank()) {
                        Text(modelLabel, color = FrostWhite)
                    }
                }
            }
        }

        InputField(
            value = complaint,
            onValueChange = onComplaintChange,
            label = "Reclamação / observação inicial (opcional)",
        )

        AppButton(
            text = if (isSubmitting) "Criando OS..." else "Abrir ordem de serviço",
            onClick = onCreate,
            enabled = !isSubmitting && vehicle != null,
        )
    }
}
