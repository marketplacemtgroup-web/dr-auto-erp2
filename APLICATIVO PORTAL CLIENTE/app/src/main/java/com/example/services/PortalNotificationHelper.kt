package com.example.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.MainActivity
import com.example.R
import com.google.firebase.messaging.RemoteMessage

object PortalNotificationHelper {
    const val CHANNEL_ID = "portal_updates"
    const val EXTRA_NAV_TARGET = "nav_target"
    const val EXTRA_ORDER_ID = "order_id"
    const val EXTRA_QUOTE_ID = "quote_id"
    const val NAV_NOTIFICATIONS = "notifications"
    const val NAV_ORDER = "order"
    const val NAV_QUOTE = "quote"
    const val NAV_APPOINTMENTS = "appointments"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = context.getString(R.string.notification_channel_description)
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }

    fun showFromRemoteMessage(context: Context, message: RemoteMessage) {
        if (!PortalNotificationPermission.isGranted(context)) return

        val title = message.notification?.title
            ?: message.data["title"]
            ?: context.getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return

        val serviceOrderId = message.data["serviceOrderId"]?.takeIf { it.isNotBlank() }
        val quoteId = message.data["quoteId"]?.takeIf { it.isNotBlank() }
        val url = message.data["url"]?.takeIf { it.isNotBlank() }

        val (navTarget, orderId, resolvedQuoteId) = when {
            url?.contains("agendamento", ignoreCase = true) == true ->
                Triple(NAV_APPOINTMENTS, null, null)
            message.data["type"] == "manutencao_preventiva" ->
                Triple(NAV_APPOINTMENTS, null, null)
            serviceOrderId != null -> Triple(NAV_ORDER, serviceOrderId, null)
            quoteId != null -> Triple(NAV_QUOTE, null, quoteId)
            url?.contains("orcamento", ignoreCase = true) == true -> {
                val token = url.substringAfterLast('/').takeIf { it.isNotBlank() }
                Triple(NAV_QUOTE, null, token)
            }
            else -> Triple(NAV_NOTIFICATIONS, null, null)
        }

        show(
            context = context,
            notificationId = (message.messageId ?: System.currentTimeMillis().toString()).hashCode(),
            title = title,
            body = body,
            navTarget = navTarget,
            orderId = orderId,
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

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
