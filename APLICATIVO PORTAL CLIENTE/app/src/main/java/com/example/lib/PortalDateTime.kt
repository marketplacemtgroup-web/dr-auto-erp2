package com.example.lib

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object PortalDateTime {
    private val BRAZIL = ZoneId.of("America/Sao_Paulo")
    private val DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("pt", "BR"))
    private val DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale("pt", "BR"))

    fun formatDate(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return try {
            parseInstant(iso).atZone(BRAZIL).format(DATE_FMT)
        } catch (_: Exception) {
            iso.substringBefore("T")
        }
    }

    fun formatDateTime(iso: String?): String {
        if (iso.isNullOrBlank()) return ""
        return try {
            parseInstant(iso).atZone(BRAZIL).format(DATE_TIME_FMT)
        } catch (_: Exception) {
            val date = iso.substringBefore("T")
            val time = iso.substringAfter("T", "").take(5)
            if (time.isNotEmpty()) "$date $time" else date
        }
    }

    private fun parseInstant(iso: String): Instant {
        val trimmed = iso.trim()
        return when {
            trimmed.endsWith("Z", ignoreCase = true) -> Instant.parse(trimmed)
            trimmed.contains('+') || trimmed.length > 19 && trimmed[19] == '-' ->
                Instant.from(java.time.OffsetDateTime.parse(trimmed))
            else -> Instant.parse("${trimmed}Z")
        }
    }
}
