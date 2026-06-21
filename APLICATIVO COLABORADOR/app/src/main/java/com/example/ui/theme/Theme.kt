package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val BetoDarkColorScheme = darkColorScheme(
    primary = RedButton,
    secondary = GoldAccent,
    tertiary = StatusSuccess,
    background = DarkBackground,
    surface = GraphiteCard,
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    primaryContainer = RedButton,
    onPrimaryContainer = Color.White,
    surfaceVariant = GraphiteCard,
    onSurfaceVariant = TextSecondary,
    outline = TextSecondary
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Force premium dark theme by default
    dynamicColor: Boolean = false, // Disable dynamic colors to enforce corporate branding
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = BetoDarkColorScheme,
        typography = Typography,
        content = content
    )
}
