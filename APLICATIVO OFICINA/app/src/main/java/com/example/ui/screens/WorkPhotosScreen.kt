package com.example.ui.screens

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.ui.components.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.WorkPhotosViewModel
import com.example.util.AppPermissions
import com.example.util.AuthImageLoader
import com.example.util.ChecklistLocalStore
import com.example.util.PhotoCapture
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun WorkPhotosScreen(
    orderId: String,
    viewModel: WorkPhotosViewModel,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val imageLoader = remember { AuthImageLoader.get(context) }

    val photos by viewModel.photos.collectAsState()
    val orderNumber by viewModel.orderNumber.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSaving by viewModel.isSaving.collectAsState()
    val error by viewModel.error.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val saveMessage by viewModel.saveMessage.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    var viewerUri by remember { mutableStateOf<String?>(null) }
    var pendingCameraUri by remember { mutableStateOf<Uri?>(null) }
    var pendingGalleryOpen by remember { mutableStateOf(false) }

    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)
    val galleryPermissionName = AppPermissions.galleryPermission()
    val galleryPermission = galleryPermissionName?.let { rememberPermissionState(it) }

    val takePictureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
    ) { success ->
        if (success) {
            pendingCameraUri?.let { viewModel.addLocalPhoto(context, it) }
        }
        pendingCameraUri = null
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri ->
        pendingGalleryOpen = false
        if (uri != null) viewModel.addLocalPhoto(context, uri)
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
        viewModel.load(context, orderId)
    }

    LaunchedEffect(actionError) {
        actionError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearActionError()
        }
    }

    LaunchedEffect(saveMessage) {
        saveMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSaveMessage()
        }
    }

    val pendingCount = photos.count { !it.isUploaded }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "FOTOS DO SERVIÇO",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite),
                        )
                        Text(
                            text = "OS #${orderNumber.ifBlank { orderId }} • Visível ao cliente",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = FrostWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface),
            )
        },
        containerColor = Color.Transparent,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { openCamera() },
                containerColor = SuccessGreen,
                contentColor = FrostWhite,
            ) {
                Icon(Icons.Default.AddAPhoto, contentDescription = "Adicionar foto")
            }
        },
    ) { innerPadding ->
        if (isLoading) {
            LoadingScreen(modifier = Modifier.padding(innerPadding))
        } else if (error != null) {
            Box(
                modifier = Modifier.padding(innerPadding).fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                ErrorState(message = error ?: "Desconhecido", onRetry = { viewModel.load(context, orderId) })
            }
        } else {
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        border = BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.5f)),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Registre o progresso do serviço",
                                style = MaterialTheme.typography.bodyMedium.copy(color = FrostWhite, fontWeight = FontWeight.Bold),
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "As fotos ficam no celular até você tocar em Salvar. O cliente vê no portal após o envio.",
                                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
                            )
                            if (pendingCount > 0) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "$pendingCount foto(s) aguardando envio",
                                    style = MaterialTheme.typography.labelMedium.copy(color = WarningAmber, fontWeight = FontWeight.Bold),
                                )
                            }
                        }
                    }

                    if (!cameraPermission.status.isGranted) {
                        PermissionRequestCard(
                            title = "Permissão da câmera",
                            description = "Permita o acesso à câmera para registrar fotos do serviço.",
                            permissionState = cameraPermission,
                            settingsHint = "Apps → Oficina do Beto → Câmera",
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Button(
                            onClick = { openCamera() },
                            enabled = cameraPermission.status.isGranted,
                            colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Câmera", fontWeight = FontWeight.Bold)
                        }
                        Button(
                            onClick = { openGallery() },
                            colors = ButtonDefaults.buttonColors(containerColor = Graphite),
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Galeria", fontWeight = FontWeight.Bold, color = FrostWhite)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (photos.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "Nenhuma foto ainda.\nToque no botão verde para adicionar.",
                                style = MaterialTheme.typography.bodyMedium.copy(color = MetallicSilver),
                            )
                        }
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(3),
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(bottom = 100.dp),
                        ) {
                            items(photos, key = { it.id }) { photo ->
                                Box(
                                    modifier = Modifier
                                        .aspectRatio(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(
                                            1.dp,
                                            if (photo.isUploaded) Graphite else WarningAmber,
                                            RoundedCornerShape(8.dp),
                                        )
                                        .clickable {
                                            photo.displayUri?.let { viewerUri = it }
                                        },
                                ) {
                                    AsyncImage(
                                        model = AuthImageLoader.resolveImageUrl(photo.displayUri) ?: photo.displayUri,
                                        contentDescription = null,
                                        imageLoader = imageLoader,
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop,
                                    )
                                    if (!photo.isUploaded) {
                                        Box(
                                            modifier = Modifier
                                                .align(Alignment.TopEnd)
                                                .padding(4.dp)
                                                .background(WarningAmber, RoundedCornerShape(4.dp))
                                                .padding(horizontal = 4.dp, vertical = 2.dp),
                                        ) {
                                            Text("LOCAL", fontSize = 8.sp, color = Color.Black, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    border = BorderStroke(1.dp, Graphite),
                ) {
                    Box(modifier = Modifier.padding(16.dp)) {
                        AppButton(
                            text = if (isSaving) "Enviando..." else "Salvar fotos ($pendingCount)",
                            onClick = { viewModel.savePhotos(context) },
                            enabled = pendingCount > 0 && !isSaving,
                            isSecondary = false,
                        )
                    }
                }

                if (viewerUri != null) {
                    Dialog(
                        onDismissRequest = { viewerUri = null },
                        properties = DialogProperties(usePlatformDefaultWidth = false),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black),
                        ) {
                            AsyncImage(
                                model = AuthImageLoader.resolveImageUrl(viewerUri) ?: viewerUri,
                                contentDescription = null,
                                imageLoader = imageLoader,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit,
                            )
                            IconButton(
                                onClick = { viewerUri = null },
                                modifier = Modifier.align(Alignment.TopEnd),
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Fechar", tint = FrostWhite)
                            }
                        }
                    }
                }
            }
        }
    }
}
