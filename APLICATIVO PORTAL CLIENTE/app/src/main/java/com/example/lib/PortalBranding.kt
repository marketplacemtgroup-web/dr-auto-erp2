package com.example.lib

object PortalBranding {
    const val APP_NAME = "OFICINA DO BETO"
    const val APP_TAGLINE = "Portal do Cliente"

    /** Logo local (apps/portal/public/branding/logo.png) */
    const val LOCAL_LOGO_PATH = "/branding/logo.png"

    /** Fallback quando a API não retorna logoUrl */
    fun defaultLogoUrl(): String = "https://oficina-beto-portal.vercel.app/branding/logo.png"

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

    private val legacyLogoUrls = setOf("/logo-wtecmotors.png")
}
