package com.example

import com.example.services.ApiClient
import com.example.types.ServiceOrder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PortalServiceOrderParsingTest {
    private val adapter = ApiClient.moshi.adapter(ServiceOrder::class.java)

    @Test
    fun serviceOrderJson_withPhotoObjects_parsesSuccessfully() {
        val json = """
        {
          "id": "so-1",
          "number": 42,
          "status": "IN_PROGRESS",
          "statusLabel": "Em execução",
          "totalAmount": 1500.5,
          "complaint": "Barulho",
          "customerVisibleNotes": null,
          "estimatedAt": null,
          "entryKm": 10000,
          "createdAt": "2026-01-10T08:00:00.000Z",
          "updatedAt": "2026-01-15T10:00:00.000Z",
          "items": [],
          "timeline": [],
          "checklistItems": [],
          "photos": [
            {
              "order": 1,
              "label": "Frente",
              "description": null,
              "result": "OK",
              "url": "/uploads/photo1.jpg",
              "mimeType": "image/jpeg",
              "source": "checklist",
              "createdAt": "2026-01-10T08:30:00.000Z"
            }
          ]
        }
        """.trimIndent()

        val order = adapter.fromJson(json)
        assertNotNull(order)
        assertEquals(1, order!!.photos?.size)
        assertEquals("/uploads/photo1.jpg", order.photos?.first()?.url)
    }
}
