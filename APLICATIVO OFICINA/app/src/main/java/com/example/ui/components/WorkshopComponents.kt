package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.model.*
import com.example.ui.theme.*

/** Tamanhos padronizados do logo em telas do app. */
enum class BrandLogoSize(val width: Dp) {
    /** Login — destaque principal */
    Login(240.dp),
    /** Cabeçalho da home */
    Header(56.dp),
    /** Perfil / rodapé */
    Compact(96.dp),
    /** Telas auxiliares (offline, etc.) */
    Small(72.dp),
}

@Composable
fun BetoLogo(
    modifier: Modifier = Modifier,
    size: BrandLogoSize = BrandLogoSize.Login,
    contentDescription: String = "Beto Mecânica — Qualidade, Confiança, Desempenho",
) {
    Image(
        painter = painterResource(id = R.drawable.logo_oficina_beto),
        contentDescription = contentDescription,
        modifier = modifier
            .width(size.width)
            .aspectRatio(1f),
        contentScale = ContentScale.Fit,
    )
}

/** Logo + nome da oficina para o cabeçalho operacional. */
@Composable
fun BrandHeaderLogo(
    modifier: Modifier = Modifier,
    subtitle: String = "GESTÃO OPERACIONAL INTERNA",
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        BetoLogo(size = BrandLogoSize.Header)
        Column {
            Text(
                text = "OFICINA DO BETO",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = FrostWhite,
                    letterSpacing = 0.5.sp,
                ),
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MetallicSilver,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                ),
            )
        }
    }
}

// 2. PRIMARY BUTTON (styled premium red / metallic dark)
@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isSecondary: Boolean = false,
    testTag: String = "app_button"
) {
    val buttonColor = if (isSecondary) PremiumGold else CrimsonRed
    val contentColor = if (isSecondary) DarkBg else FrostWhite

    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .testTag(testTag),
        enabled = enabled,
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = buttonColor,
            contentColor = contentColor,
            disabledContainerColor = Graphite.copy(alpha = 0.5f),
            disabledContentColor = MetallicSilver
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 4.dp,
            pressedElevation = 1.dp
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = text.uppercase(),
                style = MaterialTheme.typography.labelLarge.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )
            )
        }
    }
}

// 3. SECURE TEXT AND INPUT FIELDS
@Composable
fun InputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    isError: Boolean = false,
    visualTransformation: androidx.compose.ui.text.input.VisualTransformation = androidx.compose.ui.text.input.VisualTransformation.None,
    testTag: String = "input_field"
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .testTag(testTag),
        label = { Text(label, color = MetallicSilver) },
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        isError = isError,
        visualTransformation = visualTransformation,
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CrimsonRed,
            unfocusedBorderColor = Graphite,
            errorBorderColor = AccentRed,
            focusedTextColor = FrostWhite,
            unfocusedTextColor = FrostWhite,
            focusedLabelColor = PremiumGold,
            unfocusedLabelColor = MetallicSilver,
            focusedContainerColor = Color(0xE8101012),
            unfocusedContainerColor = Color(0xD8101012),
            cursorColor = CrimsonRed,
        ),
        shape = RoundedCornerShape(8.dp)
    )
}

// 4. STAT BADGES (Vermelho, Dourado, Verde, Cinza Metálico)
@Composable
fun StatusBadge(status: OrderStatus, modifier: Modifier = Modifier) {
    val (backgroundColor, textColor) = when (status) {
        OrderStatus.RECEIVED ->
            Pair(Graphite, MetallicSilver)
        OrderStatus.DIAGNOSIS, OrderStatus.AWAITING_QUOTE ->
            Pair(WarningAmber.copy(alpha = 0.15f), WarningAmber)
        OrderStatus.AWAITING_APPROVAL ->
            Pair(PremiumGold.copy(alpha = 0.15f), PremiumGold)
        OrderStatus.APPROVED, OrderStatus.IN_PROGRESS, OrderStatus.AWAITING_PART, OrderStatus.PAUSED ->
            Pair(CrimsonRed.copy(alpha = 0.15f), AccentRed)
        OrderStatus.AWAITING_PAYMENT ->
            Pair(PremiumGold.copy(alpha = 0.15f), PremiumGold)
        OrderStatus.FINISHED, OrderStatus.DELIVERED ->
            Pair(SuccessGreen.copy(alpha = 0.15f), SuccessGreen)
        OrderStatus.CANCELLED ->
            Pair(Color.DarkGray, Color.LightGray)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(backgroundColor)
            .border(1.dp, textColor.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = status.label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                color = textColor,
                letterSpacing = 0.8.sp
            )
        )
    }
}

// 5. CAR DETAILS M3 CONTAINER
@Composable
fun OrderCard(
    order: Order,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    testTag: String = "order_card"
) {
    Card(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .testTag(testTag),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = DarkSurface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, Graphite)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // OS Header
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Build,
                        contentDescription = "Gears",
                        tint = CrimsonRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "OS #${order.displayNumber}",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = FrostWhite
                        )
                    )
                }
                // Status Badge
                StatusBadge(status = order.status)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Vehicle Detail row
            Text(
                text = order.vehicleName,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = FrostWhite,
                    fontSize = 18.sp
                )
            )

            Spacer(modifier = Modifier.height(6.dp))

            // License Plate & Km Info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // BRAZIL MERCOSUL license plate styling
                Box(
                    modifier = Modifier
                        .background(Color(0xFF003399), RoundedCornerShape(4.dp))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .background(Color.White, RoundedCornerShape(2.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = order.vehiclePlate,
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.Black,
                                letterSpacing = 1.sp
                            )
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Speed,
                        contentDescription = "Odometer",
                        tint = PremiumGold,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${order.vehicleKm} KM",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = LightSilver
                        )
                    )
                }
            }

            HorizontalDivider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))

            // Client and supervisor info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "CLIENTE",
                        style = MaterialTheme.typography.labelSmall.copy(color = MetallicSilver)
                    )
                    Text(
                        text = order.clientName,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "RESPONSÁVEL",
                        style = MaterialTheme.typography.labelSmall.copy(color = MetallicSilver)
                    )
                    Text(
                        text = order.responsibleEmployee,
                        style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, color = PremiumGold)
                    )
                }
            }
        }
    }
}

// 6. DASHBOARD COUNTER HIGHLIGHT METRICS
@Composable
fun DashboardMetricCard(
    count: Int,
    label: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    borderColor: Color = CrimsonRed,
    testTag: String = "dashboard_metric_card"
) {
    Card(
        onClick = onClick,
        modifier = modifier
            .height(115.dp)
            .testTag(testTag),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite.copy(alpha = 0.5f))
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            // Left border-l-4 style accent line
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(borderColor)
            )
            
            // Content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = label.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MetallicSilver,
                            fontSize = 10.sp,
                            letterSpacing = 0.5.sp
                        ),
                        modifier = Modifier.weight(1f)
                    )
                    icon()
                }
                Text(
                    text = String.format("%02d", count),
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Black,
                        color = FrostWhite,
                        fontSize = 24.sp,
                        lineHeight = 28.sp
                    )
                )
            }
        }
    }
}

// 7. LOADER SPINNER
@Composable
fun LoadingScreen(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            BetoLogo(size = BrandLogoSize.Small)
            Spacer(modifier = Modifier.height(20.dp))
            CircularProgressIndicator(color = CrimsonRed, strokeWidth = 3.dp)
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Carregando dados da rampa...",
                style = MaterialTheme.typography.bodyMedium.copy(color = MetallicSilver, fontWeight = FontWeight.Bold)
            )
        }
    }
}

// 8. ERROR AND WARNING BANNERS
@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    isDiagnosticOnly: Boolean = false
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (isDiagnosticOnly) Graphite else DangerRed.copy(alpha = 0.15f)),
        border = BorderStroke(1.dp, if (isDiagnosticOnly) PremiumGold else DangerRed)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = if (isDiagnosticOnly) Icons.Default.Info else Icons.Default.Warning,
                contentDescription = "Alert",
                tint = if (isDiagnosticOnly) PremiumGold else DangerRed,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (isDiagnosticOnly) "Modo de Diagnóstico / Local" else "Erro do Sistema ERP",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = if (isDiagnosticOnly) PremiumGold else DangerRed
                )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium.copy(color = FrostWhite, textAlign = TextAlign.Center),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = if (isDiagnosticOnly) PremiumGold else DangerRed),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text(
                    text = if (isDiagnosticOnly) "ENTENDI" else "TENTAR RECONECTAR",
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, color = DarkBg)
                )
            }
        }
    }
}

// 9. VEHICLE SUM SUMMARY
@Composable
fun VehicleSummaryCard(order: Order, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = BorderStroke(1.dp, Graphite)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.DirectionsCar,
                contentDescription = "Car Detail",
                tint = CrimsonRed,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = order.vehicleName,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = FrostWhite)
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "PLACA: ${order.vehiclePlate}",
                        style = MaterialTheme.typography.bodySmall.copy(color = PremiumGold, fontWeight = FontWeight.Bold)
                    )
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodySmall.copy(color = Graphite)
                    )
                    Text(
                        text = "KM: ${order.vehicleKm}",
                        style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                    )
                }
            }
        }
    }
}

// 10. TIMELINE EVENT TILE
@Composable
fun TimelineItem(event: TimelineEvent, isLast: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(40.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(CrimsonRed, CircleShape)
                    .border(2.dp, DarkBg, CircleShape)
            )
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(2.dp)
                        .background(Graphite)
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = event.description,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = FrostWhite
                    )
                )
                Text(
                    text = event.date,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MetallicSilver,
                        fontSize = 11.sp
                    )
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Row {
                Text(
                    text = "Por: ${event.employeeName}  ",
                    style = MaterialTheme.typography.bodySmall.copy(color = PremiumGold, fontWeight = FontWeight.Medium)
                )
                Text(
                    text = "(${event.statusBefore} ➔ ${event.statusAfter})",
                    style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver)
                )
            }
        }
    }
}

// 11. EMPTY STATES
@Composable
fun EmptyState(title: String, subtitle: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.SearchOff,
                contentDescription = "Empty",
                tint = Graphite,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = LightSilver)
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver, textAlign = TextAlign.Center)
            )
        }
    }
}
