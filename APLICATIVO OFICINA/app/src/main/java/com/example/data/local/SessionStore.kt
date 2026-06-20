package com.example.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.data.model.User
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

private val Context.sessionDataStore: DataStore<Preferences> by preferencesDataStore("workshop_session")

class SessionStore(context: Context) {
    private val dataStore = context.sessionDataStore
    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val userAdapter = moshi.adapter(User::class.java)

    private val tokenKey = stringPreferencesKey("access_token")
    private val userKey = stringPreferencesKey("user_json")

    suspend fun save(token: String, user: User) {
        dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userKey] = userAdapter.toJson(user)
        }
    }

    suspend fun load(): Pair<String?, User?> {
        val prefs = dataStore.data.first()
        val token = prefs[tokenKey]
        val userJson = prefs[userKey]
        val user = userJson?.let { runCatching { userAdapter.fromJson(it) }.getOrNull() }
        return token to user
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }

    fun loadBlocking(): Pair<String?, User?> = runBlocking { load() }
}
