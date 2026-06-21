package com.example

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL

/**
 * Testes de conectividade contra a API de produção (mesma base do .env).
 * Rodar: ./gradlew :app:testDebugUnitTest
 */
class PortalApiConnectivityTest {
    private val apiBase = "https://oficina-beto-api.vercel.app/api"

    @Test
    fun authBranding_returns200() {
        assertEquals(200, getStatus("$apiBase/auth/branding"))
    }

    @Test
    fun portalLogin_invalidCredentials_returns401() {
        assertEquals(401, postStatus("$apiBase/portal/login", """{"cpf":"00000000000","plate":"AAA0000"}"""))
    }

    @Test
    fun portalDashboard_withoutAuth_returns401() {
        assertEquals(401, getStatus("$apiBase/portal/dashboard"))
    }

    @Test
    fun portalAccess_invalidToken_returns404() {
        assertEquals(404, getStatus("$apiBase/portal/access/invalid-token-test"))
    }

    @Test
    fun portalPublicQuote_invalidToken_returns404() {
        assertEquals(404, getStatus("$apiBase/portal/public/quote/invalid-token-test"))
    }

    @Test
    fun portalBranding_hasOrganizationColors() {
        val conn = URL("$apiBase/auth/branding").openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        val body = conn.inputStream.bufferedReader().readText()
        conn.disconnect()
        assertTrue(body.contains("primaryColor"))
        assertTrue(body.contains("OFICINA DO BETO"))
    }

    private fun getStatus(url: String): Int {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        val code = conn.responseCode
        conn.disconnect()
        return code
    }

    private fun postStatus(url: String, json: String): Int {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        conn.outputStream.use { it.write(json.toByteArray()) }
        val code = conn.responseCode
        conn.disconnect()
        return code
    }
}
