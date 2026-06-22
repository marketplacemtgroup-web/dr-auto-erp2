package com.example.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.MainActivity
import com.example.R
import com.google.firebase.messaging.RemoteMessage

object PortalNotificationHelper {
    /** Canal com som e heads-up (estilo WhatsApp). */
    const val CHANNEL_ID = "portal_alerts"
    const val EXTRA_NAV_TARGET = "nav_target"
    const val EXTRA_ORDER_ID = "order_id"
    const val EXTRA_QUOTE_ID = "quote_id"
    const val NAV_NOTIFICATIONS = "notifications"
    const val NAV_ORDER = "order"
    const val NAV_QUOTE = "quote"
    const val NAV_APPOINTMENTS = "appointments"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.notification_channel_description)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 250, 120, 250)
            enableLights(true)
            setSound(
                soundUri,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
        }
        manager.createNotificationChannel(channel)
    }

    fun showFromRemoteMessage(context: Context, message: RemoteMessage) {
        if (!PortalNotificationPermission.isGranted(context)) return

        val title = message.notification?.title
            ?: message.data["title"]
            ?: context.getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return

        showFromPayload(
            context = context,
            title = title,
            body = body,
            serviceOrderId = message.data["serviceOrderId"],
            quoteId = message.data["quoteId"],
            url = message.data["url"],
            type = message.data["type"],
            notificationId = (message.messageId ?: System.currentTimeMillis().toString()).hashCode(),
        )
    }

    fun showFromPortalNotification(
        context: Context,
        notificationId: String,
        title: String,
        body: String,
        serviceOrderId: String? = null,
        quoteId: String? = null,
        type: String? = null,
    ) {
        if (!PortalNotificationPermission.isGranted(context)) return
        showFromPayload(
            context = context,
            title = title,
            body = body,
            serviceOrderId = serviceOrderId,
            quoteId = quoteId,
            url = null,
            type = type,
            notificationId = notificationId.hashCode(),
        )
    }

    private fun showFromPayload(
        context: Context,
        title: String,
        body: String,
        serviceOrderId: String?,
        quoteId: String?,
        url: String?,
        type: String?,
        notificationId: Int,
    ) {
        val orderId = serviceOrderId?.takeIf { it.isNotBlank() }
        val qId = quoteId?.takeIf { it.isNotBlank() }
        val link = url?.takeIf { it.isNotBlank() }

        val (navTarget, resolvedOrderId, resolvedQuoteId) = when {
            link?.contains("agendamento", ignoreCase = true) == true ->
                Triple(NAV_APPOINTMENTS, null, null)
            type == "manutencao_preventiva" ->
                Triple(NAV_APPOINTMENTS, null, null)
            orderId != null -> Triple(NAV_ORDER, orderId, null)
            qId != null -> Triple(NAV_QUOTE, null, qId)
            link?.contains("orcamento", ignoreCase = true) == true -> {
                val token = link.substringAfterLast('/').takeIf { it.isNotBlank() }
                Triple(NAV_QUOTE, null, token)
            }
            else -> Triple(NAV_NOTIFICATIONS, null, null)
        }

        show(
            context = context,
            notificationId = notificationId,
            title = title,
            body = body,
            navTarget = navTarget,
            orderId = resolvedOrderId,
            quoteId = resolvedQuoteId,
        )
    }

    fun show(
        context: Context,
        notificationId: Int,
        title: String,
        body: String,
        navTarget: String = NAV_NOTIFICATIONS,
        orderId: String? = null,
        quoteId: String? = null,
    ) {
        if (!PortalNotificationPermission.isGranted(context)) return

        ensureChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_NAV_TARGET, navTarget)
            orderId?.let { putExtra(EXTRA_ORDER_ID, it) }
            quoteId?.let { putExtra(EXTRA_QUOTE_ID, it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setSound(soundUri)
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE or NotificationCompat.DEFAULT_LIGHTS)
            .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
