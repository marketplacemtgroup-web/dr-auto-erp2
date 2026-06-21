package com.example.data.local

import android.content.Context
import androidx.core.content.edit
import com.example.data.User
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("colab_session", Context.MODE_PRIVATE)
    private val userAdapter = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()
        .adapter(User::class.java)

    fun loadBlocking(): Pair<String?, User?> {
        val token = prefs.getString(KEY_TOKEN, null)
        val userJson = prefs.getString(KEY_USER, null)
        val user = userJson?.let {
            runCatching { userAdapter.fromJson(it) }.getOrNull()
        }
        return token to user
    }

    fun save(token: String, user: User) {
        prefs.edit {
            putString(KEY_TOKEN, token)
            putString(KEY_USER, userAdapter.toJson(user))
        }
    }

    fun clear() {
        prefs.edit { clear() }
    }

    companion object {
        private const val KEY_TOKEN = "access_token"
        private const val KEY_USER = "user_json"
    }
}
