package com.example.services

import android.content.Context
import com.example.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private var retrofit: Retrofit? = null
    private var portalApi: PortalApi? = null

    val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    fun getApi(context: Context): PortalApi {
        if (portalApi == null) {
            val sessionManager = SessionManager(context)

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .addInterceptor { chain ->
                    val originalRequest = chain.request()
                    val token = sessionManager.getAccessToken()

                    val builder = originalRequest.newBuilder()
                    if (token != null) {
                        builder.addHeader("Authorization", "Bearer $token")
                    }
                    chain.proceed(builder.build())
                }
                .addInterceptor(loggingInterceptor)
                .build()

            val baseUrl = resolveApiBaseUrl()

            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()

            portalApi = retrofit!!.create(PortalApi::class.java)
        }
        return portalApi!!
    }

    /**
     * Mesma API do monorepo (apps/api). Portal web usa VITE_API_URL + "/api" no fetch;
     * aqui a base já inclui "/api/" porque as rotas Retrofit são relativas (ex.: portal/login).
     */
    private fun resolveApiBaseUrl(): String {
        val defaultUrl = "https://oficina-beto-api.vercel.app/api/"
        return try {
            val configUrl = BuildConfig.PORTAL_API_URL.trim()
            if (configUrl.isEmpty() || configUrl.startsWith("MY_")) {
                defaultUrl
            } else {
                normalizeApiBaseUrl(configUrl)
            }
        } catch (_: Exception) {
            defaultUrl
        }
    }

    private fun normalizeApiBaseUrl(raw: String): String {
        var url = raw.trim().removeSuffix("/")
        if (!url.endsWith("/api", ignoreCase = true)) {
            url = "$url/api"
        }
        return "$url/"
    }
}
