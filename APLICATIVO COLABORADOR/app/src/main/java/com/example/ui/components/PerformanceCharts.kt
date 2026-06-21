package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.WeeklyPerformance
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.RedButton
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun WeeklyBarChart(
    data: List<WeeklyPerformance>,
    modifier: Modifier = Modifier,
) {
    if (data.isEmpty()) return
    val maxVal = data.maxOf { maxOf(it.os.toFloat(), it.servicos.toFloat(), it.comissao.toFloat()) }.coerceAtLeast(1f)

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Atividade semanal", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
            val barWidth = size.width / (data.size * 3.5f)
            val gap = barWidth * 0.3f
            data.forEachIndexed { index, point ->
                val xBase = index * (barWidth * 3 + gap) + gap
                val hOs = (point.os / maxVal) * size.height * 0.85f
                val hServ = (point.servicos / maxVal) * size.height * 0.85f
                drawRoundRect(
                    color = RedButton,
                    topLeft = androidx.compose.ui.geometry.Offset(xBase, size.height - hOs),
                    size = Size(barWidth, hOs),
                    cornerRadius = CornerRadius(4f, 4f),
                )
                drawRoundRect(
                    color = GoldAccent,
                    topLeft = androidx.compose.ui.geometry.Offset(xBase + barWidth + 2f, size.height - hServ),
                    size = Size(barWidth, hServ),
                    cornerRadius = CornerRadius(4f, 4f),
                )
            }
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            data.forEach { point ->
                Text(point.semana, color = TextSecondary, fontSize = 10.sp)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("■ OS", color = RedButton, fontSize = 11.sp)
            Text("■ Serviços", color = GoldAccent, fontSize = 11.sp)
        }
    }
}

@Composable
fun GoalProgressBars(
    metas: List<com.example.data.MetricGoal>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        metas.forEach { meta ->
            val progress = if (meta.meta > 0) (meta.atual.toFloat() / meta.meta).coerceIn(0f, 1f) else 0f
            Column {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(meta.titulo, color = TextPrimary, fontSize = 13.sp)
                    Text("${meta.atual}/${meta.meta}", color = TextSecondary, fontSize = 12.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Canvas(modifier = Modifier.fillMaxWidth().height(8.dp)) {
                    drawRoundRect(
                        color = Color(0xFF2C2C32),
                        size = size,
                        cornerRadius = CornerRadius(4f, 4f),
                    )
                    drawRoundRect(
                        color = RedButton,
                        size = Size(size.width * progress, size.height),
                        cornerRadius = CornerRadius(4f, 4f),
                    )
                }
            }
        }
    }
}
