package com.example.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.delay

@Composable
fun LiveClock(
    modifier: Modifier = Modifier,
    fontSize: androidx.compose.ui.unit.TextUnit = 48.sp,
) {
    var now by remember { mutableStateOf(Date()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = Date()
            delay(1000)
        }
    }
    val timeFmt = remember { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }
    Text(
        text = timeFmt.format(now),
        color = TextPrimary,
        fontSize = fontSize,
        fontWeight = FontWeight.Bold,
        modifier = modifier,
    )
}

@Composable
fun LiveDateLabel(modifier: Modifier = Modifier) {
    var now by remember { mutableStateOf(Date()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = Date()
            delay(60_000)
        }
    }
    val fmt = remember { SimpleDateFormat("EEEE, d 'de' MMMM", Locale("pt", "BR")) }
    Text(
        text = fmt.format(now).replaceFirstChar { it.uppercase() },
        color = TextSecondary,
        fontSize = 14.sp,
        modifier = modifier,
    )
}

@Composable
fun BetoLogo(modifier: Modifier = Modifier, size: Dp = 120.dp) {
    Image(
        painter = painterResource(R.drawable.logo_oficina_beto),
        contentDescription = "Beto Mecânica — Qualidade, Confiança, Desempenho",
        modifier = modifier
            .width(size)
            .aspectRatio(1f),
        contentScale = ContentScale.Fit,
    )
}

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val (text, bgColor, textColor) = when (status.lowercase()) {
        "em_execucao", "pendente" -> Triple("Em execução", Color(0x33F59E0B), StatusWarning)
        "finalizada", "aprovada", "confirmada", "valido" -> Triple(
            if (status == "valido") "Registrado" else if (status == "confirmada") "Confirmada" else "Finalizada",
            Color(0x3322C55E),
            StatusSuccess
        )
        "aguardando_aprovacao", "em_analise", "enviada" -> Triple(
            if (status == "em_analise") "Em análise" else if (status == "enviada") "Enviada" else "Aguardando aprovação",
            Color(0x333B82F6),
            StatusBlue
        )
        "paga" -> Triple("Paga", Color(0x3310B981), StatusSuccess)
        "recusada" -> Triple("Recusada", Color(0x33E11D2E), StatusDanger)
        "cancelada" -> Triple("Cancelada", Color(0x199CA3AF), TextSecondary)
        "trabalho" -> Triple("Trabalho", Color(0x333B82F6), StatusBlue)
        "folga" -> Triple("Folga", Color(0x3322C55E), StatusSuccess)
        else -> Triple(status, Color(0xFF2C2C32), TextPrimary)
    }

    Box(
        modifier = modifier
            .background(bgColor, shape = RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    backgroundColor: Color = RedButton,
    contentColor: Color = Color.White
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = backgroundColor,
            contentColor = contentColor,
            disabledContainerColor = Color(0xFF2C2C32),
            disabledContentColor = TextSecondary
        )
    ) {
        Text(
            text = text.uppercase(),
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
    }
}

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color = GraphiteCard,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            content()
        }
    }
}

@Composable
fun InputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    isPassword: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = TextSecondary) },
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else visualTransformation,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            focusedBorderColor = RedButton,
            unfocusedBorderColor = Color(0xFF2C2C32),
            focusedContainerColor = Color(0xFF131315),
            unfocusedContainerColor = Color(0xFF131315)
        ),
        modifier = modifier
            .fillMaxWidth()
            .height(62.dp),
        shape = RoundedCornerShape(10.dp)
    )
}

@Composable
fun SectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onActionClick: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        if (actionText != null && onActionClick != null) {
            Text(
                text = actionText,
                color = RedButton,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable { onActionClick() }
            )
        }
    }
}

@Composable
fun TimeClockDisclaimer() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = "Alerta",
            tint = StatusWarning,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = "Controle interno de ponto. Para uso oficial, valide regras trabalhistas com a contabilidade da oficina.",
            color = TextSecondary,
            fontSize = 11.sp,
            lineHeight = 15.sp
        )
    }
}
