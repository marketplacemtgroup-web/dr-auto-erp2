package com.example

import com.example.services.ApiClient
import com.example.types.PortalDashboard
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Garante que o JSON do dashboard (sem statusLabel na lista de OS) faz parse corretamente.
 */
class PortalDashboardParsingTest {
    private val adapter = ApiClient.moshi.adapter(PortalDashboard::class.java)

    @Test
    fun dashboardJson_withoutStatusLabel_parsesSuccessfully() {
        val json = """
        {
          "organization": {
            "name": "OFICINA DO BETO",
            "phone": "11999999999",
            "email": null,
            "portalWelcome": "Bem-vindo",
            "address": "Rua Teste",
            "logoUrl": null,
            "primaryColor": "#0284c7",
            "accentColor": "#0ea5e9"
          },
          "customer": {
            "name": "João Silva",
            "phone": "11988887777",
            "whatsapp": null
          },
          "vehicle": {
            "id": "veh-1",
            "plate": "ABC1D23",
            "brand": null,
            "model": null,
            "year": 2020,
            "color": "Prata",
            "currentKm": 45000,
            "vehicleKind": "CAR"
          },
          "serviceOrders": [
            {
              "id": "so-1",
              "number": 42,
              "status": "IN_PROGRESS",
              "totalAmount": 1500.50,
              "complaint": "Barulho no motor",
              "estimatedAt": null,
              "updatedAt": "2026-01-15T10:00:00.000Z",
              "createdAt": "2026-01-10T08:00:00.000Z"
            }
          ],
          "quotes": [],
          "attachments": []
        }
        """.trimIndent()

        val dashboard = adapter.fromJson(json)
        assertNotNull(dashboard)
        assertEquals("João Silva", dashboard!!.customer.name)
        assertEquals("Veículo", dashboard.vehicle.displayName)
        assertEquals(2020, dashboard.vehicle.year)
        assertEquals(1, dashboard.serviceOrders.size)
        assertEquals("IN_PROGRESS", dashboard.serviceOrders[0].status)
        assertEquals(42, dashboard.serviceOrders[0].number)
    }

    @Test
    fun vehicle_withBrandAndModel_displayNameWorks() {
        val json = """
        {
          "organization": { "name": "Test" },
          "customer": { "name": "Maria" },
          "vehicle": {
            "id": "v1",
            "plate": "XYZ9A88",
            "brand": "Honda",
            "model": "Civic",
            "year": 2019
          },
          "serviceOrders": [],
          "quotes": [],
          "attachments": []
        }
        """.trimIndent()

        val dashboard = adapter.fromJson(json)
        assertNotNull(dashboard)
        assertEquals("Honda Civic", dashboard!!.vehicle.displayName)
        assertTrue(dashboard.vehicle.displayYear.contains("2019"))
    }
}
