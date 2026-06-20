package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.FrostWhite
import com.example.ui.theme.Graphite
import com.example.ui.theme.LightSilver
import com.example.ui.theme.MetallicSilver
import com.example.ui.theme.PremiumGold
import com.example.ui.theme.SuccessGreen
import com.example.ui.theme.WarningAmber
import com.example.util.AppPermissions
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.PermissionState
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.shouldShowRationale

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionRequestCard(
    title: String,
    description: String,
    permissionState: PermissionState,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.PhotoCamera,
    settingsHint: String = "No celular: Configurações → Apps → Oficina do Beto → Permissões",
) {
    val context = LocalContext.current
    var hasRequestedOnce by remember { mutableStateOf(false) }
    val granted = permissionState.status.isGranted
    val showRationale = permissionState.status.shouldShowRationale
    val permanentlyDenied = !granted && hasRequestedOnce && !showRationale

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, if (granted) SuccessGreen else WarningAmber),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = if (granted) Icons.Default.CheckCircle else icon,
                contentDescription = null,
                tint = if (granted) SuccessGreen else PremiumGold,
                modifier = Modifier.size(40.dp),
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = FrostWhite,
                ),
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (granted) "Permissão liberada." else description,
                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
                textAlign = TextAlign.Center,
            )

            if (!granted) {
                Spacer(modifier = Modifier.height(14.dp))
                if (permanentlyDenied) {
                    Text(
                        text = "A permissão foi bloqueada. Abra as configurações do app para ativar manualmente.",
                        style = MaterialTheme.typography.bodySmall.copy(color = LightSilver),
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = settingsHint,
                        style = MaterialTheme.typography.labelSmall.copy(color = Graphite, fontSize = 10.sp),
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { AppPermissions.openAppSettings(context) },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Abrir configurações do app", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = {
                            hasRequestedOnce = true
                            permissionState.launchPermissionRequest()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CrimsonRed),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Permitir agora", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun DevicePermissionsCard(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val cameraState = com.google.accompanist.permissions.rememberPermissionState(AppPermissions.CAMERA)
    val galleryPerm = AppPermissions.galleryPermission()
    val galleryState = galleryPerm?.let {
        com.google.accompanist.permissions.rememberPermissionState(it)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "PERMISSÕES DO APARELHO",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = PremiumGold,
                ),
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Gerencie câmera e galeria sem sair do app.",
                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
            )
            Spacer(modifier = Modifier.height(12.dp))

            DevicePermissionRow(
                label = "Câmera",
                subtitle = "Fotografar checklist de entrada",
                granted = cameraState.status.isGranted,
                onRequest = { cameraState.launchPermissionRequest() },
                onOpenSettings = { AppPermissions.openAppSettings(context) },
            )
            if (galleryState != null) {
                Spacer(modifier = Modifier.height(10.dp))
                DevicePermissionRow(
                    label = "Fotos / galeria",
                    subtitle = "Escolher imagem já salva",
                    granted = galleryState.status.isGranted,
                    onRequest = { galleryState.launchPermissionRequest() },
                    onOpenSettings = { AppPermissions.openAppSettings(context) },
                )
            }
        }
    }
}

@Composable
private fun DevicePermissionRow(
    label: String,
    subtitle: String,
    granted: Boolean,
    onRequest: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
            Icon(
                imageVector = when {
                    granted -> Icons.Default.CheckCircle
                    label.contains("Câmera", ignoreCase = true) -> Icons.Default.PhotoCamera
                    else -> Icons.Default.PhotoLibrary
                },
                contentDescription = null,
                tint = if (granted) SuccessGreen else MetallicSilver,
                modifier = Modifier.size(20.dp),
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = FrostWhite,
                        fontWeight = FontWeight.SemiBold,
                    ),
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver, fontSize = 11.sp),
                )
            }
        }
        if (granted) {
            Text(
                text = "ATIVA",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = SuccessGreen,
                    fontWeight = FontWeight.Bold,
                ),
            )
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(onClick = onRequest) {
                    Text("Permitir", fontSize = 11.sp)
                }
                OutlinedButton(onClick = onOpenSettings) {
                    Icon(Icons.Default.Settings, contentDescription = "Configurações", modifier = Modifier.size(14.dp))
                }
            }
        }
    }
}
