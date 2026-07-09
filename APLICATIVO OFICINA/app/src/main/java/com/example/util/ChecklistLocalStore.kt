package com.example.util

import android.content.Context
import android.net.Uri
import com.example.data.model.OrderStatus
import com.example.data.model.PhotoChecklistStatus
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class LocalChecklistDraft(
    val status: PhotoChecklistStatus? = null,
    val observation: String = "",
    val localPhotoPath: String? = null,
    val isDirty: Boolean = false,
)

data class LocalWorkPhoto(
    val id: String,
    val localPath: String,
    val uploaded: Boolean = false,
    val remoteUrl: String? = null,
    val attachmentId: String? = null,
)

object ChecklistLocalStore {
    private fun checklistDir(context: Context, orderId: String): File =
        File(context.filesDir, "checklist_local/$orderId").also { it.mkdirs() }

    private fun draftFile(context: Context, orderId: String): File =
        File(checklistDir(context, orderId), "draft.json")

    private fun workPhotosDir(context: Context, orderId: String): File =
        File(context.filesDir, "work_photos/$orderId").also { it.mkdirs() }

    fun loadDrafts(context: Context, orderId: String): Map<String, LocalChecklistDraft> {
        val file = draftFile(context, orderId)
        if (!file.exists()) return emptyMap()
        return try {
            val json = JSONObject(file.readText())
            buildMap {
                json.keys().forEach { key ->
                    val obj = json.getJSONObject(key)
                    val statusCode = obj.optString("status", "").ifBlank { null }
                    put(
                        key,
                        LocalChecklistDraft(
                            status = statusCode?.let { PhotoChecklistStatus.fromApi(it) },
                            observation = obj.optString("observation", ""),
                            localPhotoPath = obj.optString("localPhotoPath", "").ifBlank { null },
                            isDirty = obj.optBoolean("isDirty", false),
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    fun saveDrafts(context: Context, orderId: String, drafts: Map<String, LocalChecklistDraft>) {
        val json = JSONObject()
        drafts.forEach { (id, draft) ->
            if (draft.isDirty || !draft.localPhotoPath.isNullOrBlank()) {
                json.put(
                    id,
                    JSONObject().apply {
                        draft.status?.apiCode?.let { put("status", it) }
                        put("observation", draft.observation)
                        draft.localPhotoPath?.let { put("localPhotoPath", it) }
                        put("isDirty", draft.isDirty)
                    },
                )
            }
        }
        draftFile(context, orderId).writeText(json.toString())
    }

    fun saveLocalPhoto(context: Context, orderId: String, itemId: String, sourceUri: Uri): String? {
        val dest = File(checklistDir(context, orderId), "photo_$itemId.webp")
        return try {
            val webp = ImageUtils.uriToWebpFile(context, sourceUri) ?: return null
            webp.copyTo(dest, overwrite = true)
            webp.delete()
            dest.absolutePath
        } catch (_: Exception) {
            null
        }
    }

    fun clearDraftItemPhoto(context: Context, orderId: String, itemId: String) {
        File(checklistDir(context, orderId), "photo_$itemId.webp").delete()
    }

    fun loadWorkPhotos(context: Context, orderId: String): List<LocalWorkPhoto> {
        val dir = workPhotosDir(context, orderId)
        val metaFile = File(dir, "meta.json")
        if (!metaFile.exists()) {
            return dir.listFiles()
                ?.filter { it.extension == "webp" }
                ?.sortedBy { it.lastModified() }
                ?.map { LocalWorkPhoto(id = it.nameWithoutExtension, localPath = it.absolutePath) }
                ?: emptyList()
        }
        return try {
            val array = JSONArray(metaFile.readText())
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val path = obj.getString("localPath")
                    if (!File(path).exists() && !obj.optBoolean("uploaded", false)) continue
                    add(
                        LocalWorkPhoto(
                            id = obj.getString("id"),
                            localPath = path,
                            uploaded = obj.optBoolean("uploaded", false),
                            remoteUrl = obj.optString("remoteUrl", "").ifBlank { null },
                            attachmentId = obj.optString("attachmentId", "").ifBlank { null },
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveWorkPhoto(context: Context, orderId: String, sourceUri: Uri): LocalWorkPhoto? {
        val id = "wp_${System.currentTimeMillis()}"
        val dest = File(workPhotosDir(context, orderId), "$id.webp")
        val webp = ImageUtils.uriToWebpFile(context, sourceUri) ?: return null
        return try {
            webp.copyTo(dest, overwrite = true)
            webp.delete()
            LocalWorkPhoto(id = id, localPath = dest.absolutePath)
        } catch (_: Exception) {
            null
        }
    }

    fun saveWorkPhotosMeta(context: Context, orderId: String, photos: List<LocalWorkPhoto>) {
        val array = JSONArray()
        photos.forEach { photo ->
            array.put(
                JSONObject().apply {
                    put("id", photo.id)
                    put("localPath", photo.localPath)
                    put("uploaded", photo.uploaded)
                    photo.remoteUrl?.let { put("remoteUrl", it) }
                    photo.attachmentId?.let { put("attachmentId", it) }
                },
            )
        }
        File(workPhotosDir(context, orderId), "meta.json").writeText(array.toString())
    }

    fun clearPendingWorkPhotos(context: Context, orderId: String) {
        val dir = workPhotosDir(context, orderId)
        dir.listFiles()?.forEach { file ->
            if (file.name != "meta.json") file.delete()
        }
        File(dir, "meta.json").delete()
    }

    fun clearOrder(context: Context, orderId: String) {
        File(context.filesDir, "checklist_local/$orderId").deleteRecursively()
        File(context.filesDir, "work_photos/$orderId").deleteRecursively()
    }

    fun isOrderClosed(status: OrderStatus): Boolean =
        status == OrderStatus.DELIVERED ||
            status == OrderStatus.FINISHED ||
            status == OrderStatus.CANCELLED

    fun displayUri(localPath: String?, remoteUri: String?): String? {
        if (!localPath.isNullOrBlank() && File(localPath).exists()) {
            return Uri.fromFile(File(localPath)).toString()
        }
        return remoteUri
    }
}
