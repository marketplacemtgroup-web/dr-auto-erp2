package com.example

import android.app.Application
import com.example.services.PortalNotificationHelper

class PortalApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        PortalNotificationHelper.ensureChannel(this)
    }
}
