package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SignalCellularConnectedNoInternet4Bar
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.AppButton
import com.example.ui.components.BetoLogo
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.DarkBg
import com.example.ui.theme.LightSilver
import com.example.ui.theme.MetallicSilver

@Composable
fun OfflineScreen(
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            BetoLogo(modifier = Modifier.size(100.dp))

            Spacer(modifier = Modifier.height(48.dp))

            Icon(
                imageVector = Icons.Default.SignalCellularConnectedNoInternet4Bar,
                contentDescription = "Desconectado",
                tint = CrimsonRed,
                modifier = Modifier.size(72.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "SEM CONEXÃO COM A INTERNET",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    letterSpacing = 1.2.sp,
                    fontSize = 20.sp
                ),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Verifique sua conexão para continuar usando o app da Beto Mecânica.",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MetallicSilver,
                    textAlign = TextAlign.Center
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            AppButton(
                text = "TENTAR RECONECTAR DA RAMPA",
                onClick = onRetry,
                isSecondary = false
            )
        }
    }
}
