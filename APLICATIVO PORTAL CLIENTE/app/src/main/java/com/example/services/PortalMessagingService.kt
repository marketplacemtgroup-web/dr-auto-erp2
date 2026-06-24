package com.example.services

import android.content.Context
import android.os.PowerManager
import android.util.Log
import com.example.types.FcmRegisterRequest
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PortalMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (
                    SessionManager(this@PortalMessagingService).isLoggedIn() &&
                    PortalNotificationPermission.isGranted(this@PortalMessagingService)
                ) {
                    ApiClient.getApi(this@PortalMessagingService).registerFcmToken(
                        FcmRegisterRequest(token = token, platform = "android"),
                    )
                    Log.i(TAG, "FCM token re-registrado após refresh")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to register new FCM token", e)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val appContext = applicationContext
        PortalNotificationHelper.ensureChannel(appContext)

        val hasNotificationPayload = message.notification != null
        if (hasNotificationPayload && !PortalAppState.isInForeground) {
            Log.d(TAG, "Push com notification payload — sistema exibe (app em background)")
            return
        }

        val wakeLock = acquireWakeLock(appContext)
        try {
            Log.d(
                TAG,
                "Exibindo push localmente: ${message.data["title"] ?: message.notification?.title}",
            )
            PortalNotificationHelper.showFromRemoteMessage(appContext, message)
            if (SessionManager(appContext).isLoggedIn()) {
                PortalRefreshBus.requestRefresh()
            }
        } finally {
            releaseWakeLock(wakeLock)
        }
    }

    private fun acquireWakeLock(context: Context): PowerManager.WakeLock? {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return null
        return pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "portalcliente:fcm").apply {
            setReferenceCounted(false)
            acquire(15_000)
        }
    }

    private fun releaseWakeLock(wakeLock: PowerManager.WakeLock?) {
        if (wakeLock?.isHeld == true) wakeLock.release()
    }

    companion object {
        private const val TAG = "PortalMessagingService"
    }
}
