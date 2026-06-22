package com.example.lib

object PortalBranding {
    const val APP_NAME = "OFICINA DO BETO"
    const val APP_TAGLINE = "Portal do Cliente"

    /** Logo oficial do portal (apps/portal/public/logo-oficinadobeto.png). */
    const val LOCAL_LOGO_PATH = "/logo-oficinadobeto.png"

    fun defaultLogoUrl(): String = resolveMediaUrl(LOCAL_LOGO_PATH)

    fun resolveLogoUrl(apiLogoUrl: String?): String {
        val trimmed = apiLogoUrl?.trim()
        if (!trimmed.isNullOrEmpty() && !legacyLogoUrls.contains(trimmed)) {
            return resolveMediaUrl(trimmed)
        }
        return defaultLogoUrl()
    }

    fun resolveMediaUrl(path: String): String {
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val base = com.example.BuildConfig.PORTAL_API_URL
            .trim()
            .removeSuffix("/")
            .removeSuffix("/api")
        return "$base${if (path.startsWith("/")) path else "/$path"}"
    }

    private val legacyLogoUrls = setOf(
        "/logo-wtecmotors.png",
        "/branding/logo.png",
    )
}
