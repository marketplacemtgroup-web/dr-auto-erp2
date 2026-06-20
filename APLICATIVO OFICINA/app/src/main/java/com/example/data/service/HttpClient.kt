package com.example.data.service

import com.example.BuildConfig
import com.example.data.api.WorkshopApi
import com.example.data.model.User
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

class ApiException(val statusCode: Int, message: String) : Exception(message)

object HttpClient {
    val apiBaseUrl: String
        get() {
            val fromBuild = BuildConfig.API_BASE_URL.trim()
            if (fromBuild.isNotBlank()) {
                return if (fromBuild.endsWith("/")) fromBuild else "$fromBuild/"
            }
            return "http://10.0.2.2:3001/api/"
        }

    val useMockData: Boolean
        get() = BuildConfig.USE_MOCK_DATA.equals("true", ignoreCase = true)

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.BASIC
        }
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Accept", "application/json")
                .apply {
                    SessionManager.token?.let { addHeader("Authorization", "Bearer $it") }
                }
                .build()
            chain.proceed(request)
        }
        .build()

    val api: WorkshopApi = Retrofit.Builder()
        .baseUrl(apiBaseUrl)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(WorkshopApi::class.java)

    val rawClient: OkHttpClient get() = okHttpClient
}

object SessionManager {
    private var sessionStore: com.example.data.local.SessionStore? = null

    var token: String? = null
        private set
    var currentUser: User? = null
        private set

    fun init(store: com.example.data.local.SessionStore) {
        sessionStore = store
        val (savedToken, savedUser) = store.loadBlocking()
        token = savedToken
        currentUser = savedUser
    }

    suspend fun saveSession(user: User, authToken: String) {
        token = authToken
        currentUser = user
        sessionStore?.save(authToken, user)
    }

    suspend fun clearSession() {
        token = null
        currentUser = null
        sessionStore?.clear()
    }

    val isLoggedIn: Boolean
        get() = !token.isNullOrBlank() && currentUser != null

    fun hasPermission(vararg slugs: String): Boolean {
        val perms = currentUser?.permissions.orEmpty()
        if (perms.contains("admin")) return true
        return slugs.any { perms.contains(it) }
    }
}
