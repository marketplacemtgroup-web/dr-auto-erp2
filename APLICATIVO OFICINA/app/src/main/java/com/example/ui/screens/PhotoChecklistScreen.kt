package com.example.ui.screens

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.model.*
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.ChecklistViewModel
import com.example.util.AppPermissions
import com.example.util.ChecklistTemplate
import com.example.util.PhotoCapture
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun PhotoChecklistScreen(
    orderId: String,
    viewModel: ChecklistViewModel,
    onNavigateBack: () -> Unit,
    onChecklistCompleted: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val photosList by viewModel.photosList.collectAsState()
    val orderNumber by viewModel.orderNumber.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val isUploading by viewModel.isUploading.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    var activeCameraItem by remember { mutableStateOf<ChecklistPhoto?>(null) }
    var observationText by remember { mutableStateOf("") }
    var capturedUri by remember { mutableStateOf<Uri?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var pendingGalleryOpen by remember { mutableStateOf(false) }

    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)
    val galleryPermissionName = AppPermissions.galleryPermission()
    val galleryPermission = galleryPermissionName?.let { rememberPermissionState(it) }

    val takePictureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
    ) { success ->
        if (success) {
            capturedUri = pendingCameraUri
        }
        pendingCameraUri = null
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri ->
        pendingGalleryOpen = false
        if (uri != null) capturedUri = uri
    }

    fun openCamera() {
        if (!cameraPermission.status.isGranted) return
        val (uri, _) = PhotoCapture.createTempImageUri(context)
        pendingCameraUri = uri
        takePictureLauncher.launch(uri)
    }

    fun openGallery() {
        val needsGalleryPerm = galleryPermissionName != null && galleryPermission != null
        if (needsGalleryPerm && !galleryPermission!!.status.isGranted) {
            pendingGalleryOpen = true
            galleryPermission.launchPermissionRequest()
            return
        }
        galleryLauncher.launch("image/*")
    }

    LaunchedEffect(galleryPermission?.status?.isGranted, pendingGalleryOpen) {
        if (pendingGalleryOpen && (galleryPermission == null || galleryPermission.status.isGranted)) {
            pendingGalleryOpen = false
            galleryLauncher.launch("image/*")
        }
    }

    LaunchedEffect(orderId) {
        viewModel.loadChecklist(orderId)
    }

    LaunchedEffect(actionError) {
        actionError?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearActionError()
        }
    }

    val completedCount = photosList.count { ChecklistTemplate.isComplete(it) }
    val totalCount = photosList.size
    val progressPercent = if (totalCount > 0) completedCount.toFloat() / totalCount.toFloat() else 0.0f

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "CHECKLIST FOTOGRÁFICO",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                        )
                        Text(
                            text = "OS #${orderNumber.ifBlank { orderId }} • Proteção Jurídica Digital",
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
                                progress = { progressPercent },
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
                            if (item.isTextOnly) {
                                ChecklistTextItemCard(
                                    item = item,
                                    onSave = { text ->
                                        viewModel.saveTextItem(orderId, item.id, text)
                                    },
                                )
                            } else {
                                ChecklistItemCard(
                                    item = item,
                                    onCameraClick = {
                                        activeCameraItem = item
                                        observationText = item.observation
                                        capturedUri = item.photoUri?.let { Uri.parse(it) }
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

                if (activeCameraItem != null) {
                    val targetItem = activeCameraItem!!
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.95f))
                            .clickable { }
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
                                        text = "FOTO — OS #${orderNumber.ifBlank { orderId }}",
                                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                                    )
                                    IconButton(onClick = {
                                        activeCameraItem = null
                                        capturedUri = null
                                        observationText = ""
                                    }) {
                                        Icon(imageVector = Icons.Default.Close, contentDescription = "Fechar", tint = FrostWhite)
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Text(
                                    text = targetItem.label.uppercase(),
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                if (!cameraPermission.status.isGranted) {
                                    PermissionRequestCard(
                                        title = "Permissão da câmera necessária",
                                        description = "Para fotografar o veículo no checklist, permita o acesso à câmera. Você também pode alterar isso depois em Perfil → Permissões do aparelho.",
                                        permissionState = cameraPermission,
                                        settingsHint = "Celular → Apps → Oficina do Beto → Permissões → Câmera",
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                }

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(180.dp)
                                        .background(Color.Black, RoundedCornerShape(8.dp))
                                        .border(2.dp, CrimsonRed, RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (capturedUri != null) {
                                        AsyncImage(
                                            model = capturedUri,
                                            contentDescription = "Foto capturada",
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop,
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.Camera,
                                            contentDescription = "Câmera",
                                            tint = Graphite,
                                            modifier = Modifier.size(64.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Button(
                                        onClick = { openCamera() },
                                        enabled = cameraPermission.status.isGranted,
                                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = FrostWhite)
                                        Spacer(Modifier.width(6.dp))
                                        Text("CÂMERA", color = FrostWhite, fontWeight = FontWeight.Bold)
                                    }
                                    Button(
                                        onClick = { openGallery() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Graphite),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = LightSilver)
                                        Spacer(Modifier.width(6.dp))
                                        Text("GALERIA", color = FrostWhite, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(16.dp))

                                InputField(
                                    value = observationText,
                                    onValueChange = { observationText = it },
                                    label = "Observação (opcional)"
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                AppButton(
                                    text = if (isUploading) "Enviando..." else "Subir para sistema",
                                    onClick = {
                                        val uri = capturedUri
                                        if (uri != null) {
                                            viewModel.uploadPhotoAndUpdate(
                                                context = context,
                                                orderId = orderId,
                                                item = targetItem,
                                                localUri = uri,
                                                status = PhotoChecklistStatus.OK,
                                                observation = observationText,
                                            ) {
                                                activeCameraItem = null
                                                capturedUri = null
                                                observationText = ""
                                            }
                                        } else {
                                            viewModel.updatePhotoItem(
                                                orderId,
                                                targetItem.id,
                                                PhotoChecklistStatus.ATTENTION,
                                                observationText,
                                            )
                                            activeCameraItem = null
                                        }
                                    },
                                    enabled = !isUploading && (capturedUri != null || observationText.isNotBlank())
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
fun ChecklistTextItemCard(
    item: ChecklistPhoto,
    onSave: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var draft by remember(item.id, item.observation) { mutableStateOf(item.observation) }
    val isComplete = draft.isNotBlank()

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(if (isComplete) SuccessGreen else CrimsonRed, CircleShape),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite),
                    )
                }
                Text(
                    text = "TEXTO",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = PremiumGold,
                        fontSize = 8.sp,
                    ),
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = ChecklistTemplate.textPlaceholder(item.label),
                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
            )
            Spacer(modifier = Modifier.height(6.dp))

            InputField(
                value = draft,
                onValueChange = { draft = it },
                label = item.label,
            )

            Spacer(modifier = Modifier.height(12.dp))

            AppButton(
                text = "Salvar",
                onClick = { onSave(draft) },
                enabled = draft.isNotBlank(),
                isSecondary = true,
            )
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
