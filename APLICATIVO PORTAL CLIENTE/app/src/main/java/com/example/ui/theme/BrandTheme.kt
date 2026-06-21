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
    val surfaceBg: Color get() = if (isDark) Color(0xFF0F172A) else Color(0xFFF1F5F9)
    val cardBg: Color get() = if (isDark) Color(0xFF1E293B) else Color.White
    val textPrimary: Color get() = if (isDark) Color(0xFFF8FAFC) else Color(0xFF0F172A)
    val textSecondary: Color get() = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val textDark: Color get() = if (isDark) Color(0xFFE2E8F0) else Color(0xFF1E293B)
    val border: Color get() = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
    val navBg: Color get() = if (isDark) Color(0xFF1E293B) else Color.White

    companion object {
        fun defaults(isDark: Boolean = false) = DynamicBrandColors(
            primary = Color(0xFF1E3A8A),
            accent = Color(0xFF3B82F6),
            isDark = isDark,
        )

        fun fromOrganization(org: Organization?, isDark: Boolean): DynamicBrandColors {
            val primary = parseHexColor(org?.primaryColor) ?: Color(0xFF1E3A8A)
            val accent = parseHexColor(org?.accentColor) ?: Color(0xFF3B82F6)
            return DynamicBrandColors(primary = primary, accent = accent, isDark = isDark)
        }

        fun fromPublicBranding(
            primaryColor: String?,
            accentColor: String?,
            isDark: Boolean,
        ): DynamicBrandColors {
            val primary = parseHexColor(primaryColor) ?: Color(0xFF1E3A8A)
            val accent = parseHexColor(accentColor) ?: Color(0xFF3B82F6)
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
