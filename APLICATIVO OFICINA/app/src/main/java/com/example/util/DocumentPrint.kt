package com.example.util

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.example.data.service.HttpClient
import com.example.data.service.SessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.ByteArrayInputStream

object DocumentPrint {
    suspend fun printServiceOrder(context: Context, orderId: String) {
        val html = fetchPrintHtml("print/service-orders/$orderId")
        showPrintDialog(context, html, "OS #$orderId")
    }

    suspend fun printQuote(context: Context, quoteId: String) {
        val html = fetchPrintHtml("print/quotes/$quoteId")
        showPrintDialog(context, html, "Orcamento")
    }

    private suspend fun fetchPrintHtml(path: String): String = withContext(Dispatchers.IO) {
        val base = HttpClient.apiBaseUrl.trimEnd('/')
        val url = "$base/$path"
        val token = SessionManager.token ?: throw IllegalStateException("Sessao expirada. Faca login novamente.")
        val request = Request.Builder()
            .url(url)
            .get()
            .header("Authorization", "Bearer $token")
            .header("Accept", "text/html")
            .build()

        HttpClient.rawClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Falha ao gerar documento (${response.code})")
            }
            response.body?.string()?.takeIf { it.isNotBlank() }
                ?: throw Exception("Documento vazio")
        }
    }

    private fun showPrintDialog(context: Context, html: String, jobName: String) {
        val appContext = context.applicationContext
        val token = SessionManager.token
        val origin = printOrigin()

        Handler(Looper.getMainLooper()).post {
            val webView = WebView(appContext)
            webView.settings.javaScriptEnabled = false
            webView.settings.loadWithOverviewMode = true
            webView.settings.useWideViewPort = true

            webView.webViewClient = object : WebViewClient() {
                private var printed = false

                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    val url = request.url?.toString().orEmpty()
                    if (token != null && url.contains("/api/attachments/")) {
                        return loadAuthenticatedResource(url, token)
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    if (printed) return
                    printed = true
                    val printManager = appContext.getSystemService(Context.PRINT_SERVICE) as PrintManager
                    printManager.print(
                        jobName,
                        webView.createPrintDocumentAdapter(jobName),
                        PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                            .build(),
                    )
                }
            }

            webView.loadDataWithBaseURL(origin, html, "text/html", "UTF-8", null)
        }
    }

    private fun printOrigin(): String {
        val base = HttpClient.apiBaseUrl.trimEnd('/')
        return if (base.endsWith("/api")) base.removeSuffix("/api") else base
    }

    private fun loadAuthenticatedResource(url: String, token: String): WebResourceResponse? {
        return try {
            val request = Request.Builder()
                .url(url)
                .get()
                .header("Authorization", "Bearer $token")
                .build()
            HttpClient.rawClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val body = response.body ?: return null
                val mime = body.contentType()?.toString()?.substringBefore(";") ?: "image/jpeg"
                WebResourceResponse(
                    mime,
                    null,
                    ByteArrayInputStream(body.bytes()),
                )
            }
        } catch (_: Exception) {
            null
        }
    }
}
