package com.example

import com.example.lib.QuoteLineHelper
import com.example.lib.QuotePriceHelper
import com.example.services.ApiClient
import com.example.types.PortalQuoteLine
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

    @Test
    fun serviceOrderJson_withNullChecklistResult_parsesSuccessfully() {
        val json = """
        {
          "id": "so-2",
          "number": 43,
          "status": "DIAGNOSIS",
          "statusLabel": "Diagnóstico",
          "totalAmount": 0,
          "createdAt": "2026-01-10T08:00:00.000Z",
          "updatedAt": "2026-01-15T10:00:00.000Z",
          "items": [
            {
              "id": "item-1",
              "description": "Troca de óleo",
              "itemType": "SERVICE",
              "quantity": 1,
              "unitPrice": 120,
              "discount": "0"
            }
          ],
          "timeline": [],
          "checklistItems": [
            {
              "category": "Exterior",
              "label": "Para-choque",
              "result": null,
              "notes": null,
              "photoUrl": null
            }
          ],
          "photos": []
        }
        """.trimIndent()

        val order = adapter.fromJson(json)
        assertNotNull(order)
        assertEquals(null, order!!.checklistItems?.first()?.result)
        assertEquals(120.0, order.items?.first()?.unitPrice)
    }

    @Test
    fun buildApprovePayload_usesPendingLinesOnly() {
        val lines = listOf(
            PortalQuoteLine("l1", "A", "SERVICE", 1.0, 10.0, approved = true),
            PortalQuoteLine("l2", "B", "PART", 1.0, 20.0, approved = null),
        )
        val payload = QuoteLineHelper.buildApprovePayload(lines)
        assertEquals(listOf("l2" to true), payload)
    }

    @Test
    fun portalQuoteRow_freeTextFields_parsesSuccessfully() {
        val adapter = ApiClient.moshi.adapter(com.example.types.PortalQuoteRow::class.java)
        val json = """
        {
          "id": "q-1",
          "number": 12,
          "status": "PENDING",
          "amount": 0,
          "canRespond": true,
          "isSupplement": false,
          "pendingLineCount": 0,
          "paymentAgreement": "50% entrada + 50% na entrega",
          "freeTextEnabled": true,
          "freeTextContent": "Revisão completa do motor",
          "freeTextAmount": 2500.0,
          "lines": []
        }
        """.trimIndent()

        val quote = adapter.fromJson(json)
        assertNotNull(quote)
        assertEquals(true, quote!!.freeTextEnabled)
        assertEquals("Revisão completa do motor", quote.freeTextContent)
        assertEquals(2500.0, quote.freeTextAmount)
        assertEquals(2500.0, QuotePriceHelper.displayAmount(quote))
    }
}
