package com.example

import android.app.Application
import com.example.data.api.SessionManager
import com.example.data.local.SessionStore

class ColaboradorApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SessionManager.init(SessionStore(this))
    }
}
