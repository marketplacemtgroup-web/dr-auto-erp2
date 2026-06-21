package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = false,
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val brand = LocalDynamicBrand.current
  val colorScheme = if (darkTheme) {
    darkColorScheme(
      primary = brand.primary,
      secondary = brand.accent,
      tertiary = brand.accent,
      background = brand.surfaceBg,
      surface = brand.cardBg,
      onPrimary = Color.White,
      onBackground = brand.textPrimary,
      onSurface = brand.textPrimary,
    )
  } else {
    lightColorScheme(
      primary = brand.primary,
      secondary = brand.accent,
      tertiary = brand.accent,
      background = brand.surfaceBg,
      surface = brand.cardBg,
      onPrimary = Color.White,
      onBackground = brand.textPrimary,
      onSurface = brand.textPrimary,
    )
  }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
