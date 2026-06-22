package com.example.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import com.example.types.Organization

enum class ThemeMode { LIGHT, DARK, SYSTEM }

data class DynamicBrandColors(
    val primary: Color,
    val accent: Color,
    val isDark: Boolean,
) {
    val surfaceBg: Color get() = if (isDark) Color(0xFF020B1C) else Color(0xFFF4F6F9)
    val cardBg: Color get() = if (isDark) Color(0xFF081B35) else Color.White
    val textPrimary: Color get() = if (isDark) Color(0xFFFFFFFF) else Color(0xFF0F172A)
    val textSecondary: Color get() = if (isDark) Color(0xFFA8B3C7) else Color(0xFF475569)
    val textDark: Color get() = if (isDark) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val border: Color get() = if (isDark) Color(0x33FFFFFF) else Color(0xFFE2E8F0)
    val navBg: Color get() = if (isDark) Color(0xF206152D) else Color(0xEBFFFFFF)
    val quoteHeader: Color get() = Color(0xFF0F3D4C)

    companion object {
        fun defaults(isDark: Boolean = false) = DynamicBrandColors(
            primary = Color(0xFF0284C7),
            accent = Color(0xFF0EA5E9),
            isDark = isDark,
        )

        fun fromOrganization(org: Organization?, isDark: Boolean): DynamicBrandColors {
            val primary = parseHexColor(org?.primaryColor) ?: Color(0xFF0284C7)
            val accent = parseHexColor(org?.accentColor) ?: Color(0xFF0EA5E9)
            return DynamicBrandColors(primary = primary, accent = accent, isDark = isDark)
        }

        fun fromPublicBranding(
            primaryColor: String?,
            accentColor: String?,
            isDark: Boolean,
        ): DynamicBrandColors {
            val primary = parseHexColor(primaryColor) ?: Color(0xFF0284C7)
            val accent = parseHexColor(accentColor) ?: Color(0xFF0EA5E9)
            return DynamicBrandColors(primary = primary, accent = accent, isDark = isDark)
        }

        private fun parseHexColor(hex: String?): Color? {
            if (hex.isNullOrBlank()) return null
            val clean = hex.trim().removePrefix("#")
            return try {
                when (clean.length) {
                    6 -> Color(0xFF000000 or clean.toLong(16))
                    8 -> Color(clean.toLong(16))
                    else -> null
                }
            } catch (_: Exception) {
                null
            }
        }
    }
}

val LocalDynamicBrand = compositionLocalOf { DynamicBrandColors.defaults() }

object BrandThemeHolder {
    var colors by mutableStateOf(DynamicBrandColors.defaults())
}
