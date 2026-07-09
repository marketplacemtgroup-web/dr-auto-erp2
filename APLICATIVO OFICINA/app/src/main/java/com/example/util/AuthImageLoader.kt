package com.example.util

import android.content.Context
import coil.ImageLoader
import com.example.data.service.HttpClient

object AuthImageLoader {
    @Volatile
    private var instance: ImageLoader? = null

    fun get(context: Context): ImageLoader {
        return instance ?: synchronized(this) {
            instance ?: ImageLoader.Builder(context.applicationContext)
                .okHttpClient(HttpClient.rawClient)
                .build()
                .also { instance = it }
        }
    }

    fun resolveImageUrl(uri: String?): String? {
        if (uri.isNullOrBlank()) return null
        if (uri.startsWith("file://") || uri.startsWith("content://")) return uri
        if (uri.startsWith("http://") || uri.startsWith("https://")) return uri
        val base = HttpClient.apiBaseUrl.trimEnd('/')
        return when {
            uri.startsWith("/api/") -> {
                val root = base.removeSuffix("/api")
                "$root$uri"
            }
            uri.startsWith("/") -> "$base$uri"
            else -> uri
        }
    }
}
