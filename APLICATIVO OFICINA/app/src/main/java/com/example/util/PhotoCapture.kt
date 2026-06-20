package com.example.util

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

object PhotoCapture {
    fun createTempImageUri(context: Context): Pair<Uri, File> {
        val file = File.createTempFile("checklist_", ".jpg", context.cacheDir)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        return uri to file
    }
}
