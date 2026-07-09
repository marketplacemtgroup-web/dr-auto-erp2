package com.example.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import java.io.File

object ImageUtils {
    private const val WEBP_QUALITY = 85
    const val WEBP_MIME = "image/webp"

    /**
     * Lê a imagem do URI e grava como WebP em arquivo temporário.
     * Reduz o tamanho em relação a PNG/JPEG originais.
     */
    fun uriToWebpFile(context: Context, uri: Uri): File? {
        return try {
            val bitmap = context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)
            } ?: return null

            val file = File.createTempFile("upload_", ".webp", context.cacheDir)
            file.outputStream().use { out ->
                val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Bitmap.CompressFormat.WEBP_LOSSY
                } else {
                    @Suppress("DEPRECATION")
                    Bitmap.CompressFormat.WEBP
                }
                if (!bitmap.compress(format, WEBP_QUALITY, out)) {
                    file.delete()
                    return null
                }
            }
            bitmap.recycle()
            file
        } catch (_: Exception) {
            null
        }
    }
}
