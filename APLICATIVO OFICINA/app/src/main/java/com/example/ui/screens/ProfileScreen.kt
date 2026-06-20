package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.example.data.service.SessionManager
import com.example.ui.components.AppButton
import com.example.ui.components.BetoLogo
import com.example.ui.components.BrandLogoSize
import com.example.ui.components.DevicePermissionsCard
import com.example.ui.theme.*
import com.example.ui.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val user = SessionManager.currentUser

    val email = user?.email ?: "admin@betomecanica.com.br"
    val name = user?.name ?: "Beto Souza"
    val role = user?.role ?: "Administrador"
    val workshop = user?.workshop ?: "Beto Mecânica - Matriz"
    val permissions = user?.permissions ?: listOf("checklist", "orcamento", "os_write", "financeiro")

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "MEU PERFIL",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface)
            )
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 24.dp, bottom = 32.dp)
        ) {
            // User Avatar & Brand Header
            item {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(CircleShape)
                        .background(DarkSurface)
                        .border(1.5.dp, PremiumGold, CircleShape)
                        .padding(10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    BetoLogo(size = BrandLogoSize.Header)
                }
            }

            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = FrostWhite,
                            fontSize = 22.sp
                        )
                    )
                    Text(
                        text = role.uppercase(),
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = PremiumGold,
                            letterSpacing = 1.sp
                        )
                    )
                }
            }

            // Workshop detail card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    border = BorderStroke(1.dp, Graphite)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Store, "Workshop", tint = CrimsonRed, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "UNIDADE / OFICINA ATUAL",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = CrimsonRed)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = workshop,
                            style = MaterialTheme.typography.bodyMedium.copy(color = FrostWhite, fontWeight = FontWeight.Bold)
                        )
                        Text(
                            text = "Email: $email",
                            style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                        )
                    }
                }
            }

            // Permissões do aparelho (câmera / galeria)
            item {
                DevicePermissionsCard()
            }

            // Permissions block
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkSurface),
                    border = BorderStroke(1.dp, Graphite)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.VerifiedUser, "Permissions", tint = PremiumGold, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "PERMISSÕES INTEGRALIZADAS (ERP)",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        permissions.forEach { perm ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = when (perm) {
                                        "checklist" -> "Checklist Fotográfico de Proteção"
                                        "orcamento" -> "Editar Preços e Elaborar Orçamentos"
                                        "os_write" -> "Modificar Status das Ordens"
                                        "financeiro" -> "Gerenciamento Financeiro Integrado"
                                        else -> perm
                                    },
                                    style = MaterialTheme.typography.bodyMedium.copy(color = LightSilver)
                                )
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Habilitado",
                                    tint = SuccessGreen,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }

            // App info credits
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    BetoLogo(size = BrandLogoSize.Compact)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "OFICINA DO BETO — App v1.0",
                        style = MaterialTheme.typography.bodySmall.copy(color = Graphite, fontSize = 10.sp),
                        textAlign = TextAlign.Center,
                    )
                }
            }

            // Logout action trigger button
            item {
                Spacer(modifier = Modifier.height(12.dp))
                AppButton(
                    text = "Encerrar Sessão de Trabalho",
                    onClick = {
                        authViewModel.logout()
                        onLogout()
                    },
                    isSecondary = false
                )
            }
        }
    }
}
