package com.example

import android.app.Application
import com.example.data.local.SessionStore
import com.example.data.service.SessionManager

class WorkshopApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SessionManager.init(SessionStore(this))
    }
}
