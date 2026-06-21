package com.example.services

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREF_NAME = "portal_cliente_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_CUSTOMER_NAME = "customer_name"
        private const val KEY_PLATE = "vehicle_plate"
        private const val KEY_ORGANIZATION_NAME = "organization_name"
        private const val KEY_DASHBOARD_CACHE = "dashboard_cache"
        private const val KEY_NOTIFICATIONS_CACHE = "notifications_cache"
        private const val KEY_THEME_MODE = "theme_mode"
    }

    fun saveSession(token: String, customerName: String, plate: String, organizationName: String) {
        prefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, token)
            putString(KEY_CUSTOMER_NAME, customerName)
            putString(KEY_PLATE, plate)
            putString(KEY_ORGANIZATION_NAME, organizationName)
            apply()
        }
    }

    fun getAccessToken(): String? {
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getCustomerName(): String {
        return prefs.getString(KEY_CUSTOMER_NAME, "") ?: ""
    }

    fun getPlate(): String {
        return prefs.getString(KEY_PLATE, "") ?: ""
    }

    fun getOrganizationName(): String {
        return prefs.getString(KEY_ORGANIZATION_NAME, "") ?: ""
    }

    fun isLoggedIn(): Boolean {
        return getAccessToken() != null
    }

    fun cacheDashboard(json: String) {
        prefs.edit().putString(KEY_DASHBOARD_CACHE, json).apply()
    }

    fun getCachedDashboard(): String? {
        return prefs.getString(KEY_DASHBOARD_CACHE, null)
    }

    fun cacheNotifications(json: String) {
        prefs.edit().putString(KEY_NOTIFICATIONS_CACHE, json).apply()
    }

    fun getCachedNotifications(): String? {
        return prefs.getString(KEY_NOTIFICATIONS_CACHE, null)
    }

    fun getThemeMode(): String {
        return prefs.getString(KEY_THEME_MODE, "system") ?: "system"
    }

    fun setThemeMode(mode: String) {
        prefs.edit().putString(KEY_THEME_MODE, mode).apply()
    }

    fun clearSession() {
        prefs.edit().apply {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_CUSTOMER_NAME)
            remove(KEY_PLATE)
            remove(KEY_ORGANIZATION_NAME)
            remove(KEY_DASHBOARD_CACHE)
            remove(KEY_NOTIFICATIONS_CACHE)
            apply()
        }
    }
}
