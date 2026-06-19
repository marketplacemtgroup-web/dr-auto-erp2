package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.example.data.model.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.ChecklistViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotoChecklistScreen(
    orderId: String,
    viewModel: ChecklistViewModel,
    onNavigateBack: () -> Unit,
    onChecklistCompleted: () -> Unit,
    modifier: Modifier = Modifier
) {
    val photosList by viewModel.photosList.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    // Manage a camera emulator view
    var activeCameraItem by remember { mutableStateOf<ChecklistPhoto?>(null) }
    var mockObservingText by remember { mutableStateOf("") }
    var mockPhotoUri by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(orderId) {
        viewModel.loadChecklist(orderId)
    }

    // Progress math
    val completedCount = photosList.count { it.status != PhotoChecklistStatus.PENDING }
    val totalCount = photosList.size
    val progressPercent = if (totalCount > 0) completedCount.toFloat() / totalCount.toFloat() else 0.0f

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "CHECKLIST FOTOGRÁFICO",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                        )
                        Text(
                            text = "OS #${orderId} • Proteção Jurídica Digital",
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
        containerColor = DarkBg
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
                ErrorState(message = error ?: "Desconhecido", onRetry = { viewModel.loadChecklist(orderId) })
            }
        } else {
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Header Status Info (Checklist progress)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        border = BorderStroke(1.dp, Graphite)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "PROGRESSO DA VISTORIA",
                                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                                )
                                Text(
                                    text = "$completedCount de $totalCount Itens",
                                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                progress = progressPercent,
                                color = CrimsonRed,
                                trackColor = Graphite,
                                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
                            )
                        }
                    }

                    // Checklist scroll
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 80.dp)
                    ) {
                        items(photosList) { item ->
                            ChecklistItemCard(
                                item = item,
                                onCameraClick = {
                                    activeCameraItem = item
                                    mockObservingText = item.observation
                                    mockPhotoUri = item.photoUri
                                },
                                onStatusChange = { newStatus ->
                                    viewModel.updatePhotoItem(orderId, item.id, newStatus, item.observation, item.photoUri)
                                },
                                onObservationChange = { observation ->
                                    viewModel.updatePhotoItem(orderId, item.id, item.status, observation, item.photoUri)
                                }
                            )
                        }
                    }
                }

                // SUBMIT BOTTOM PANEL
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    border = BorderStroke(1.dp, Graphite)
                ) {
                    Box(modifier = Modifier.padding(16.dp)) {
                        AppButton(
                            text = "Concluir Checklist de Entrada",
                            onClick = {
                                viewModel.completeChecklist(orderId, onChecklistCompleted)
                            },
                            enabled = completedCount == totalCount,
                            isSecondary = false
                        )
                    }
                }

                // CAMERA EMULATOR DIALOG OVERLAY (Immersive photo trigger simulation)
                if (activeCameraItem != null) {
                    val targetItem = activeCameraItem!!
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.95f))
                            .clickable { /* prevent bubble clicks */ }
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = DarkSurface),
                            border = BorderStroke(1.dp, Graphite)
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "CÂMERA INTERNA [ OS #${orderId} ]",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                                    )
                                    IconButton(onClick = { activeCameraItem = null }) {
                                        Icon(imageVector = Icons.Default.Close, contentDescription = "Fechar", tint = FrostWhite)
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Text(
                                    text = "Ângulo Solicitado: ${targetItem.label.uppercase()}",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                                )
                                Text(
                                    text = "Centralize o item e evite trepidações.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                // Camera viewfinder simulator
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(180.dp)
                                        .background(Color.Black, RoundedCornerShape(8.dp))
                                        .border(2.dp, CrimsonRed, RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                   ) {
                                    if (mockPhotoUri != null) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Sucesso",
                                            tint = SuccessGreen,
                                            modifier = Modifier.size(64.dp)
                                        )
                                    } else {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(
                                                imageVector = Icons.Default.Camera,
                                                contentDescription = "Lente",
                                                tint = Graphite,
                                                modifier = Modifier.size(64.dp)
                                            )
                                            Text(
                                                text = "Aguardando disparo da foto...",
                                                color = MetallicSilver,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Shoot controls
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Button(
                                        onClick = {
                                            // Click trigger simulates actual uploading photo path
                                            mockPhotoUri = "file://beto_mecanica/os_${orderId}_${targetItem.label.lowercase()}.png"
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(imageVector = Icons.Default.PhotoCamera, contentDescription = "Capturar", tint = FrostWhite)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("DISPARAR", color = FrostWhite, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            mockPhotoUri = "file://gallery/os_${orderId}.png"
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Graphite),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(imageVector = Icons.Default.PhotoLibrary, contentDescription = "Galeria", tint = LightSilver)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("GALERIA", color = FrostWhite, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                // Observation note input
                                InputField(
                                    value = mockObservingText,
                                    onValueChange = { mockObservingText = it },
                                    label = "Observação desta irregularidade (opcional)"
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                AppButton(
                                    text = "Confirmar Item do Checklist",
                                    onClick = {
                                        viewModel.updatePhotoItem(
                                            orderId,
                                            targetItem.id,
                                            if (mockPhotoUri != null) PhotoChecklistStatus.OK else PhotoChecklistStatus.PENDING,
                                            mockObservingText,
                                            mockPhotoUri
                                        )
                                        activeCameraItem = null
                                    },
                                    enabled = mockPhotoUri != null,
                                    isSecondary = false
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChecklistItemCard(
    item: ChecklistPhoto,
    onCameraClick: () -> Unit,
    onStatusChange: (PhotoChecklistStatus) -> Unit,
    onObservationChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Card Title Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(if (item.status != PhotoChecklistStatus.PENDING) SuccessGreen else CrimsonRed, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                    )
                }

                if (item.isRequired) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(CrimsonRed.copy(alpha = 0.1f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "OBRIGATÓRIO",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = CrimsonRed, fontSize = 8.sp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action row consisting of Launcher buttons and live preview
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Large triggering camera thumbnail box
                Box(
                    modifier = Modifier
                        .size(90.dp)
                        .background(Color.Black, RoundedCornerShape(6.dp))
                        .border(1.dp, Graphite, RoundedCornerShape(6.dp))
                        .clickable { onCameraClick() },
                    contentAlignment = Alignment.Center
                ) {
                    if (item.photoUri != null) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(imageVector = Icons.Default.Check, contentDescription = "Tirada", tint = SuccessGreen)
                            Text("REFOTO", fontSize = 10.sp, color = MetallicSilver, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(imageVector = Icons.Default.CameraAlt, contentDescription = "Tirar Foto", tint = CrimsonRed)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("FOTOGRAFAR", fontSize = 9.sp, color = MetallicSilver, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Interactive Status Buttons requested (OK, Atenção, Danificado, Não se aplica)
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // OK (Green)
                        StatusSelectionButton(
                            label = "OK",
                            isSelected = item.status == PhotoChecklistStatus.OK,
                            activeColor = SuccessGreen,
                            onClick = { onStatusChange(PhotoChecklistStatus.OK) },
                            modifier = Modifier.weight(1f)
                        )

                        // Atenção (Gold/Amarelo)
                        StatusSelectionButton(
                            label = "ATENÇÃO",
                            isSelected = item.status == PhotoChecklistStatus.ATTENTION,
                            activeColor = WarningAmber,
                            onClick = { onStatusChange(PhotoChecklistStatus.ATTENTION) },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Danificado (Vermelho)
                        StatusSelectionButton(
                            label = "DANIFICADO",
                            isSelected = item.status == PhotoChecklistStatus.DAMAGED,
                            activeColor = DangerRed,
                            onClick = { onStatusChange(PhotoChecklistStatus.DAMAGED) },
                            modifier = Modifier.weight(1.3f)
                        )

                        // N/A (Cinza)
                        StatusSelectionButton(
                            label = "N/A",
                            isSelected = item.status == PhotoChecklistStatus.NONE,
                            activeColor = NeutralGray,
                            onClick = { onStatusChange(PhotoChecklistStatus.NONE) },
                            modifier = Modifier.weight(0.7f)
                        )
                    }
                }
            }

            // Annotation note
            if (item.status != PhotoChecklistStatus.PENDING) {
                Spacer(modifier = Modifier.height(12.dp))
                InputField(
                    value = item.observation,
                    onValueChange = onObservationChange,
                    label = "Anotação mecânica"
                )
            }
        }
    }
}

@Composable
fun StatusSelectionButton(
    label: String,
    isSelected: Boolean,
    activeColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) activeColor.copy(alpha = 0.2f) else Graphite
    val borderStrokeColor = if (isSelected) activeColor else Graphite
    val contentTextColor = if (isSelected) activeColor else MetallicSilver

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(backgroundColor)
            .border(1.dp, borderStrokeColor, RoundedCornerShape(4.dp))
            .clickable { onClick() }
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.Bold,
                color = contentTextColor,
                fontSize = 11.sp
            )
        )
    }
}
