package com.example.data.service

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object HttpClient {
    private const val DEFAULT_BASE_URL = "https://api.betomecanica.example.com" // Placeholder for their real ERP/API URL

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                // Add token dynamically if available in our SessionManager
                .apply {
                    SessionManager.token?.let {
                        addHeader("Authorization", "Bearer $it")
                    }
                }
                .build()
            chain.proceed(request)
        }
        .build()

    private val retrofitBuilder = Retrofit.Builder()
        .baseUrl(DEFAULT_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    fun <T> createService(serviceClass: Class<T>): T {
        return retrofitBuilder.create(serviceClass)
    }
}

// Simple in-memory session manager for Auth Tokens matching SecureStore
object SessionManager {
    var token: String? = null
    var currentUser: com.example.data.model.User? = null

    fun saveSession(user: com.example.data.model.User, authToken: String) {
        currentUser = user
        token = authToken
    }

    fun clearSession() {
        token = null
        currentUser = null
    }

    val isLoggedIn: Boolean
        get() = token != null
}
