package com.example

import com.example.data.api.ServiceOrderListResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PaginatedApiParsingTest {
    private val adapter = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()
        .adapter(ServiceOrderListResponse::class.java)

    @Test
    fun serviceOrdersList_paginatedJson_parsesSuccessfully() {
        val json = """
        {
          "data": [
            {
              "id": "so-1",
              "number": 42,
              "status": "IN_PROGRESS",
              "totalAmount": 1500.50,
              "updatedAt": "2026-01-15T10:00:00.000Z",
              "vehicle": {
                "plate": "ABC1D23",
                "customer": { "name": "João Silva" }
              }
            }
          ],
          "pagination": {
            "page": 1,
            "limit": 50,
            "total": 1,
            "totalPages": 1
          }
        }
        """.trimIndent()

        val response = adapter.fromJson(json)
        assertNotNull(response)
        assertEquals(1, response!!.data.size)
        assertEquals(42, response.data[0].number)
        assertEquals(1, response.pagination?.totalPages)
    }
}
