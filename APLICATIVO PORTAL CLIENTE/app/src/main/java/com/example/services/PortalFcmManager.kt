package com.example.services

import android.content.Context
import android.util.Log
import com.example.types.FcmRegisterRequest
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

object PortalFcmManager {
    private const val TAG = "PortalFcmManager"

    suspend fun registerWithApi(context: Context) {
        if (!SessionManager(context).isLoggedIn()) return
        if (!PortalNotificationPermission.isGranted(context)) {
            Log.d(TAG, "FCM registration skipped: notification permission not granted")
            return
        }
        try {
            val fcmToken = FirebaseMessaging.getInstance().token.await()
            if (fcmToken.isBlank()) return
            ApiClient.getApi(context).registerFcmToken(
                FcmRegisterRequest(token = fcmToken, platform = "android"),
            )
            Log.d(TAG, "FCM token registered")
        } catch (e: Exception) {
            Log.w(TAG, "FCM registration skipped: ${e.message}")
        }
    }
}
