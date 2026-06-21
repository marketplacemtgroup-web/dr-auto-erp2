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

            // Read API Base URL from BuildConfig (injected via .env by the secrets plugin)
            // or fallback to the standard production URL
            val baseUrl = try {
                val configUrl = BuildConfig.PORTAL_API_URL
                if (configUrl.isNullOrEmpty() || configUrl.startsWith("MY_")) {
                    "https://api.oficinadobeto.com.br/api/"
                } else {
                    if (configUrl.endsWith("/")) configUrl else "$configUrl/"
                }
            } catch (e: Exception) {
                "https://api.oficinadobeto.com.br/api/"
            }

            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .build()

            portalApi = retrofit!!.create(PortalApi::class.java)
        }
        return portalApi!!
    }
}
