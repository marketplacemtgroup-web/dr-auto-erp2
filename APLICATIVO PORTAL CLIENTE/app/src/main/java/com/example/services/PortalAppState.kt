package com.example.services

/** Indica se o app está visível (foreground) — evita notificação duplicada com FCM híbrido. */
object PortalAppState {
    @Volatile
    var isInForeground: Boolean = false
}
