package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.*
import com.example.ui.theme.*

// 1. DYNAMIC VECTOR BRANDING LOGO (drawn via Compose Canvas)
@Composable
fun BetoLogo(modifier: Modifier = Modifier, titleSize: Float = 22f, subtitleSize: Float = 11f) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(90.dp)
                .background(Color.Transparent),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = size / 2.0f
                val radius = size.minDimension / 2.0f - 8.0f

                // Draw solid background circle for contrast
                drawCircle(
                    color = Color(0xFF070708),
                    radius = radius + 8f
                )

                // 1. Draw outer Red Ring representing power / shield
                drawCircle(
                    color = CrimsonRed,
                    radius = radius,
                    style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
                )

                // 2. Draw outer gear teeth elements around ring (8 segments)
                val teethCount = 8
                val toothRingRadius = radius + 2.dp.toPx()
                for (i in 0 until teethCount) {
                    val angle = (i * 360f / teethCount) * (Math.PI / 180f).toFloat()
                    val x = center.width + toothRingRadius * kotlin.math.cos(angle)
                    val y = center.height + toothRingRadius * kotlin.math.sin(angle)
                    drawCircle(
                        color = CrimsonRed,
                        radius = 5.dp.toPx(),
                        center = androidx.compose.ui.geometry.Offset(x, y)
                    )
                }

                // 3. Draw inner premium Gold hexagon representation
                val hexPath = Path().apply {
                    val side = radius - 8.dp.toPx()
                    for (i in 0 until 6) {
                        val angle = (i * 60f - 30f) * (Math.PI / 180f).toFloat()
                        val x = center.width + side * kotlin.math.cos(angle)
                        val y = center.height + side * kotlin.math.sin(angle)
                        if (i == 0) moveTo(x, y) else lineTo(x, y)
                    }
                    close()
                }
                drawPath(
                    path = hexPath,
                    color = PremiumGold,
                    style = Stroke(width = 1.5.dp.toPx())
                )

                // 4. Draw Crossed Wrenches / Pistons representing Beto Mechanics (Simplified high-impact emblem)
                // Left-to-right slash wrench stem
                drawLine(
                    color = LightSilver,
                    start = androidx.compose.ui.geometry.Offset(center.width - 20.dp.toPx(), center.height + 20.dp.toPx()),
                    end = androidx.compose.ui.geometry.Offset(center.width + 20.dp.toPx(), center.height - 20.dp.toPx()),
                    strokeWidth = 5.dp.toPx(),
                    cap = StrokeCap.Round
                )
                // Right-to-left slash wrench stem
                drawLine(
                    color = LightSilver,
                    start = androidx.compose.ui.geometry.Offset(center.width + 20.dp.toPx(), center.height + 20.dp.toPx()),
                    end = androidx.compose.ui.geometry.Offset(center.width - 20.dp.toPx(), center.height - 20.dp.toPx()),
                    strokeWidth = 5.dp.toPx(),
                    cap = StrokeCap.Round
                )

                // Central red engine piston head representation
                drawRect(
                    color = CrimsonRed,
                    topLeft = androidx.compose.ui.geometry.Offset(center.width - 12.dp.toPx(), center.height - 18.dp.toPx()),
                    size = androidx.compose.ui.geometry.Size(24.dp.toPx(), 20.dp.toPx()),
                    style = Stroke(width = 3.dp.toPx())
                )
                drawLine(
                    color = CrimsonRed,
                    start = androidx.compose.ui.geometry.Offset(center.width, center.height - 8.dp.toPx()),
                    end = androidx.compose.ui.geometry.Offset(center.width, center.height + 15.dp.toPx()),
                    strokeWidth = 4.dp.toPx()
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "BETO MECÂNICA",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.SansSerif,
                letterSpacing = 1.5.sp,
                fontSize = titleSize.sp,
                color = FrostWhite
            )
        )
        Text(
            text = "QUALIDADE • CONFIANÇA • DESEMPENHO",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
                fontSize = subtitleSize.sp,
                color = PremiumGold
            )
        )
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
            unfocusedTextColor = LightSilver,
            focusedContainerColor = DarkSurface,
            unfocusedContainerColor = DarkSurface
        ),
        shape = RoundedCornerShape(8.dp)
    )
}

// 4. STAT BADGES (Vermelho, Dourado, Verde, Cinza Metálico)
@Composable
fun StatusBadge(status: OrderStatus, modifier: Modifier = Modifier) {
    val (backgroundColor, textColor) = when (status) {
        OrderStatus.ABERTA, OrderStatus.AGUARDANDO_CHECKLIST, OrderStatus.CHECKLIST_PENDENTE -> 
            Pair(Graphite, MetallicSilver)
        OrderStatus.EM_ANALISE, OrderStatus.AGUARDANDO_ORCAMENTO -> 
            Pair(WarningAmber.copy(alpha = 0.15f), WarningAmber)
        OrderStatus.ORCAMENTO_ENVIADO, OrderStatus.AGUARDANDO_APROVACAO -> 
            Pair(PremiumGold.copy(alpha = 0.15f), PremiumGold)
        OrderStatus.APROVADA, OrderStatus.EM_EXECUCAO -> 
            Pair(CrimsonRed.copy(alpha = 0.15f), AccentRed)
        OrderStatus.FINALIZADA, OrderStatus.PRONTA_PARA_RETIRADA, OrderStatus.ENTREGUE -> 
            Pair(SuccessGreen.copy(alpha = 0.15f), SuccessGreen)
        OrderStatus.CANCELADA -> 
            Pair(Color.DarkGray, Color.LightGray)
        else -> Pair(Graphite, LightSilver)
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
                        text = "OS #${order.id}",
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

            Divider(color = Graphite, modifier = Modifier.padding(vertical = 12.dp))

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
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
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
