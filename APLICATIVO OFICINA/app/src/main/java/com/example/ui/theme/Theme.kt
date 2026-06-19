package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BetoMecanicaColorScheme = darkColorScheme(
    primary = CrimsonRed,
    onPrimary = FrostWhite,
    primaryContainer = CrimsonRed,
    onPrimaryContainer = FrostWhite,
    secondary = PremiumGold,
    onSecondary = DarkBg,
    secondaryContainer = Graphite,
    onSecondaryContainer = LightSilver,
    tertiary = MetallicSilver,
    onTertiary = FrostWhite,
    background = DarkBg,
    onBackground = FrostWhite,
    surface = DarkSurface,
    onSurface = LightSilver,
    surfaceVariant = Graphite,
    onSurfaceVariant = FrostWhite,
    error = DangerRed,
    onError = FrostWhite
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Force dark-premium theme for the workshop
    dynamicColor: Boolean = false, // Keep it true to branding constraints
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = BetoMecanicaColorScheme,
        typography = Typography,
        content = content
    )
}
