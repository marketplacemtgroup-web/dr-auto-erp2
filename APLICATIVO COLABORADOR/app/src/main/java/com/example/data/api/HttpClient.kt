package com.example.data.api

import com.example.BuildConfig
import com.example.data.User
import com.example.data.local.SessionStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object SessionManager {
    private var sessionStore: SessionStore? = null

    var token: String? = null
        private set
    var currentUser: User? = null
        private set

    fun init(store: SessionStore) {
        sessionStore = store
        val (savedToken, savedUser) = store.loadBlocking()
        token = savedToken
        currentUser = savedUser
    }

    fun saveSession(user: User, authToken: String) {
        token = authToken
        currentUser = user
        sessionStore?.save(authToken, user)
    }

    fun clearSession() {
        token = null
        currentUser = null
        sessionStore?.clear()
    }

    val isLoggedIn: Boolean
        get() = !token.isNullOrBlank() && currentUser != null

    fun hasPermission(vararg slugs: String): Boolean {
        val perms = currentUser?.permissoes.orEmpty()
        if (perms.contains("admin.access")) return true
        return slugs.any { perms.contains(it) }
    }
}

object HttpClient {
    private val configuredBaseUrl: String = resolveDefaultBaseUrl()

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.BASIC
        }
    }

    private fun buildOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val original = chain.request()
            val builder = original.newBuilder().header("Accept", "application/json")
            val path = original.url.encodedPath
            val isPublicAuth = path.endsWith("/auth/login") ||
                path.endsWith("/auth/register-organization") ||
                path.endsWith("/auth/branding") ||
                path.endsWith("/auth/setup-status")
            if (!isPublicAuth) {
                SessionManager.token?.let { builder.header("Authorization", "Bearer $it") }
            }
            if (original.body != null && original.header("Content-Type") == null) {
                builder.header("Content-Type", "application/json")
            }
            chain.proceed(builder.build())
        }
        .build()

    @Volatile
    private var retrofit: Retrofit = buildRetrofit(configuredBaseUrl)

    @Volatile
    var api: BetoApi = retrofit.create(BetoApi::class.java)
        private set

    val baseUrl: String get() = configuredBaseUrl

    fun resolveDefaultBaseUrl(): String {
        val fromBuild = BuildConfig.API_BASE_URL.trim()
        if (fromBuild.isNotBlank() && !fromBuild.contains("sua-api")) {
            return normalizeUrl(fromBuild)
        }
        return "https://oficina-beto-api.vercel.app/api/"
    }

    private fun normalizeUrl(url: String): String {
        val trimmed = url.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }

    private fun buildRetrofit(baseUrl: String): Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(buildOkHttp())
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
}
