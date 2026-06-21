package com.example.services

import android.util.Log
import com.example.types.FcmRegisterRequest
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PortalMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (SessionManager(this@PortalMessagingService).isLoggedIn()) {
                    ApiClient.getApi(this@PortalMessagingService).registerFcmToken(
                        FcmRegisterRequest(token = token, platform = "android")
                    )
                }
            } catch (e: Exception) {
                Log.w("PortalMessagingService", "Failed to register new FCM token", e)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d("PortalMessagingService", "Push received: ${message.notification?.title}")
    }
}
