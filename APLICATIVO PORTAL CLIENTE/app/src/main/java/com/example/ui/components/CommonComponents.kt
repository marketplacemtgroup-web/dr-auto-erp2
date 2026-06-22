package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.lib.PortalDateTime
import com.example.lib.PortalStatus
import com.example.types.*
import com.example.ui.theme.LocalDynamicBrand

object BrandPalette {
    val DeepBlue: Color
        @Composable get() = LocalDynamicBrand.current.primary
    val SparkBlue: Color
        @Composable get() = LocalDynamicBrand.current.accent
    val SlateGray: Color
        @Composable get() = LocalDynamicBrand.current.textPrimary
    val MetallicSilver: Color
        @Composable get() = LocalDynamicBrand.current.surfaceBg
    val TextDark: Color
        @Composable get() = LocalDynamicBrand.current.textDark
    val TextSecondary: Color
        @Composable get() = LocalDynamicBrand.current.textSecondary
    val BorderGray: Color
        @Composable get() = LocalDynamicBrand.current.border
    val CardBg: Color
        @Composable get() = LocalDynamicBrand.current.cardBg
    val NavBg: Color
        @Composable get() = LocalDynamicBrand.current.navBg
    
    // Status Colors
    val StatusPendingBg = Color(0xFFFEF3C7)     // Amber
    val StatusPendingText = Color(0xFFD97706)   
    val StatusProgressBg = Color(0xFFDBEAFE)    // Blue
    val StatusProgressText = Color(0xFF2563EB)  
    val StatusSuccessBg = Color(0xFFD1FAE5)     // Green
    val StatusSuccessText = Color(0xFF059669)   
    val StatusErrorBg = Color(0xFFFEE2E2)       // Red
    val StatusErrorText = Color(0xFFDC2626)     
    val StatusGreyBg = Color(0xFFF3F4F6)        // Light Grey
    val StatusGreyText = Color(0xFF4B5563)      
}

@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    testTag: String = "",
    enabled: Boolean = true,
    containerColor: Color = BrandPalette.DeepBlue,
    contentColor: Color = Color.White,
    icon: ImageVector? = null
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = containerColor.copy(alpha = 0.5f)
        ),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
            .testTag(testTag)
            .heightIn(min = 52.dp),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(ButtonDefaults.IconSize))
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            )
        }
    }
}

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color = Color.Unspecified,
    content: @Composable ColumnScope.() -> Unit
) {
    val cardBg = if (backgroundColor == Color.Unspecified) BrandPalette.CardBg else backgroundColor
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, BrandPalette.BorderGray, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp),
        content = content
    )
}

@Composable
fun SectionHeader(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Black,
                color = BrandPalette.SlateGray,
                letterSpacing = (-0.5).sp
            )
        )
        if (!subtitle.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = BrandPalette.TextDark.copy(alpha = 0.6f)
                )
            )
        }
    }
}

@Composable
fun StatusBadge(status: String, label: String, modifier: Modifier = Modifier) {
    val (bgColor, textColor) = when (status.uppercase()) {
        "RECEIVED", "OPEN", "ABERTA", "AWAITING_QUOTE", "AGUARDANDO_ORCAMENTO" -> 
            Pair(BrandPalette.StatusPendingBg, BrandPalette.StatusPendingText)
        
        "AWAITING_APPROVAL", "ORCAMENTO_ENVIADO", "AGUARDANDO_APROVACAO" -> 
            Pair(Color(0xFFFFF3E0), Color(0xFFE65100)) // Light Orange
            
        "APPROVED", "APROVADA", "FINISHED", "FINALIZADA", "DELIVERED", "ENTREGUE", "PRONTA_PARA_RETIRADA" -> 
            Pair(BrandPalette.StatusSuccessBg, BrandPalette.StatusSuccessText)
            
        "IN_PROGRESS", "EM_EXECUCAO", "DIAGNOSIS", "CHECKLIST_CONCLUIDO" -> 
            Pair(BrandPalette.StatusProgressBg, BrandPalette.StatusProgressText)
            
        "PAUSED", "CANCELLED", "CANCELADA", "REJECTED" -> 
            Pair(BrandPalette.StatusErrorBg, BrandPalette.StatusErrorText)
            
        else -> 
            Pair(BrandPalette.StatusGreyBg, BrandPalette.StatusGreyText)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                color = textColor,
                letterSpacing = 0.5.sp
            )
        )
    }
}

@Composable
fun LicensePlateView(plate: String, modifier: Modifier = Modifier) {
    val formattedPlate = plate.replace("-", "").uppercase()
    Row(
        modifier = modifier
            .width(135.dp)
            .height(42.dp)
            .clip(RoundedCornerShape(6.dp))
            .border(2.dp, Color(0xFF0C2340), RoundedCornerShape(6.dp))
            .background(Color.White),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Mercosul blue stripe
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.3f)
                    .background(Color(0xFF0033A0))
                    .padding(horizontal = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "BRASIL",
                    color = Color.White,
                    fontSize = 7.sp,
                    fontWeight = FontWeight.Bold,
                )
                Icon(
                    imageVector = Icons.Default.DirectionsCar,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(8.dp)
                )
            }
            // Plate digits
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.7f),
                contentAlignment = Alignment.Center
            ) {
                val plateShow = if (formattedPlate.length == 7) {
                    "${formattedPlate.substring(0, 3)} ${formattedPlate.substring(3)}"
                } else plate.uppercase()
                
                Text(
                    text = plateShow,
                    color = Color.Black,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

@Composable
fun VehicleCard(vehicle: Vehicle, modifier: Modifier = Modifier) {
    AppCard(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = vehicle.displayName,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = BrandPalette.SlateGray
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.DirectionsCar,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = BrandPalette.SparkBlue
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Cor: ${vehicle.color ?: "N/D"} • Ano: ${vehicle.displayYear}",
                        style = MaterialTheme.typography.bodySmall.copy(color = BrandPalette.TextSecondary)
                    )
                }
                if (vehicle.currentKm != null && vehicle.currentKm > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Km Atual: ${vehicle.currentKm} km",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontWeight = FontWeight.Medium,
                            color = BrandPalette.TextDark
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                LicensePlateView(plate = vehicle.plate)
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(BrandPalette.StatusSuccessBg)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Em dia",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = BrandPalette.StatusSuccessText
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun OrderCard(
    order: ServiceOrderListItem,
    vehicle: Vehicle? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    AppCard(
        modifier = modifier.clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Ordem de Serviço #${order.number}",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = BrandPalette.DeepBlue
                        )
                    )
                    Text(
                        text = "Abertura: ${PortalDateTime.formatDate(order.createdAt)}",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                    )
                }
                StatusBadge(status = order.status, label = PortalStatus.osStatusLabel(order.status))
            }
            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = BrandPalette.BorderGray)
            Spacer(modifier = Modifier.height(12.dp))
            
            if (vehicle != null) {
                Text(
                    text = "${vehicle.displayName} (${vehicle.color ?: ""})",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Medium),
                    color = BrandPalette.SlateGray
                )
            }
            
            if (!order.complaint.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Queixa: \"${order.complaint}\"",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.DarkGray),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            
            if (!order.estimatedAt.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(BrandPalette.MetallicSilver)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Event,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = BrandPalette.DeepBlue
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Previsão: ${PortalDateTime.formatDate(order.estimatedAt)}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = BrandPalette.DeepBlue,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Ver Detalhes",
                    color = BrandPalette.SparkBlue,
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = BrandPalette.SparkBlue
                )
            }
        }
    }
}

@Composable
fun BudgetCard(
    quote: PortalQuoteRow,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onApprove: (() -> Unit)? = null,
    onReject: (() -> Unit)? = null,
    isActing: Boolean = false,
) {
    val isPending = quote.status.uppercase() == "PENDING" && PortalStatus.quoteNeedsResponse(quote)
    AppCard(
        modifier = modifier
            .then(
                if (isPending) Modifier.border(1.dp, Color(0x80FBBF24), RoundedCornerShape(12.dp))
                else Modifier
            )
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ReceiptLong,
                        contentDescription = null,
                        tint = BrandPalette.SparkBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Orçamento #${quote.number ?: "—"}",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = BrandPalette.SlateGray
                        )
                    )
                }
                
                val statusLabel = PortalStatus.quoteStatusLabel(quote.status)
                StatusBadge(status = quote.status, label = statusLabel)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = BrandPalette.BorderGray)
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = "Valor Total:",
                style = MaterialTheme.typography.labelMedium.copy(color = Color.Gray)
            )
            Text(
                text = "R$ %.2f".format(quote.amount),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Black,
                    color = BrandPalette.TextDark
                )
            )
            
            if (quote.pendingLineCount > 0 && quote.status.uppercase() == "PENDING") {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Aguardando sua resposta em ${quote.pendingLineCount} itens",
                    color = Color(0xFFC2410C), // Deep Orange
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold)
                )
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            if (isPending && onApprove != null && onReject != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = onReject,
                        enabled = !isActing,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandPalette.StatusErrorText)
                    ) { Text("Recusar", fontSize = 12.sp) }
                    Button(
                        onClick = onApprove,
                        enabled = !isActing,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                    ) { Text("Aprovar", fontSize = 12.sp) }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isPending) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(0xFFFEF3C7))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "AÇÃO NECESSÁRIA",
                                color = Color(0xFFB45309),
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold)
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (isPending) "Responder Orçamento" else "Visualizar",
                            color = BrandPalette.SparkBlue,
                            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = BrandPalette.SparkBlue
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TimelineItemView(
    history: ServiceOrderStatusHistory,
    isLast: Boolean = false,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(32.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(BrandPalette.SparkBlue)
            )
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(60.dp)
                        .background(BrandPalette.BorderGray)
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = history.toLabel,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                    color = BrandPalette.SlateGray
                )
                Text(
                    text = PortalDateTime.formatDateTime(history.createdAt),
                    style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                )
            }
            if (!history.notes.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = history.notes,
                    style = MaterialTheme.typography.bodyMedium.copy(color = Color.DarkGray)
                )
            }
            if (!history.userName.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Responsável: ${history.userName}",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun QuickServiceGrid(
    items: List<Triple<String, ImageVector, () -> Unit>>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.chunked(2).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                row.forEach { (title, icon, onClick) ->
                    AppCard(
                        modifier = Modifier
                            .weight(1f)
                            .clickable(onClick = onClick)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = BrandPalette.SparkBlue,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = title,
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    color = BrandPalette.SlateGray
                                ),
                                textAlign = TextAlign.Center,
                                fontSize = 12.sp,
                                lineHeight = 14.sp
                            )
                        }
                    }
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun DetailTabRow(
    tabs: List<String>,
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
    badgeCounts: List<Int>? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(BrandPalette.CardBg)
            .border(1.dp, BrandPalette.BorderGray, RoundedCornerShape(12.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        tabs.forEachIndexed { index, label ->
            val selected = selectedIndex == index
            val badge = badgeCounts?.getOrNull(index) ?: 0
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (selected) BrandPalette.DeepBlue else Color.Transparent)
                    .clickable { onTabSelected(index) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = label,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (selected) Color.White else BrandPalette.TextSecondary
                    )
                    if (badge > 0) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(if (selected) Color.White.copy(alpha = 0.25f) else BrandPalette.DeepBlue)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = badge.toString(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selected) Color.White else Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PhotoGalleryGrid(photos: List<String>, modifier: Modifier = Modifier) {
    if (photos.isEmpty()) {
        EmptyState(message = "Nenhuma foto disponível.", icon = Icons.Default.PhotoLibrary)
        return
    }
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        photos.forEach { url ->
            AppCard {
                AsyncImage(
                    model = com.example.lib.PortalBranding.resolveMediaUrl(url),
                    contentDescription = "Foto",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
            }
        }
    }
}

@Composable
fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandPalette.MetallicSilver),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(
                color = BrandPalette.DeepBlue,
                strokeWidth = 4.dp,
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Carregando...",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium,
                    color = BrandPalette.TextSecondary
                )
            )
        }
    }
}

@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(BrandPalette.MetallicSilver)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.ErrorOutline,
                contentDescription = null,
                tint = BrandPalette.StatusErrorText,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Eita! Ocorreu um erro",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                color = BrandPalette.SlateGray
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium.copy(color = Color.Gray),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(24.dp))
            AppButton(
                text = "Tentar Novamente",
                onClick = onRetry,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun EmptyState(
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Default.Inbox
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.LightGray,
                modifier = Modifier.size(56.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Medium,
                    color = Color.Gray
                ),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun OfflineBanner(
    isOffline: Boolean,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isOffline,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically(),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFFFEF2F2))
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.WifiOff,
                contentDescription = null,
                tint = Color(0xFFDC2626),
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Sem conexão com a internet. Exibindo dados salvos.",
                color = Color(0xFF991B1B),
                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    testTag: String = ""
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = { Text(placeholder) },
        leadingIcon = leadingIcon?.let {
            { Icon(it, contentDescription = null, tint = BrandPalette.SparkBlue) }
        },
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        singleLine = singleLine,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = BrandPalette.SparkBlue,
            unfocusedBorderColor = BrandPalette.BorderGray,
            focusedLabelColor = BrandPalette.SparkBlue,
            unfocusedLabelColor = Color.Gray
        ),
        modifier = modifier
            .fillMaxWidth()
            .testTag(testTag)
    )
}
