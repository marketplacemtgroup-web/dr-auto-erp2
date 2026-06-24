package com.example.lib

import com.example.types.PortalQuoteLine
import com.example.types.PortalQuoteRow

object QuotePriceHelper {
    data class CategoryTotals(
        val approved: Double,
        val pending: Double,
        val rejected: Double,
    ) {
        val total: Double get() = approved + pending + rejected
    }

    data class QuoteBreakdown(
        val services: CategoryTotals,
        val parts: CategoryTotals,
    ) {
        val approvedTotal: Double get() = services.approved + parts.approved
        val pendingTotal: Double get() = services.pending + parts.pending
        val grandTotal: Double get() = services.total + parts.total
    }

    fun lineTotal(line: PortalQuoteLine): Double {
        val discount = line.discount ?: 0.0
        return (line.quantity * line.unitPrice) - discount
    }

    fun breakdown(lines: List<PortalQuoteLine>): QuoteBreakdown {
        var svcApproved = 0.0
        var svcPending = 0.0
        var svcRejected = 0.0
        var partApproved = 0.0
        var partPending = 0.0
        var partRejected = 0.0

        for (line in lines) {
            val amount = lineTotal(line)
            val isService = line.lineType.uppercase() == "SERVICE"
            when (line.approved) {
                true -> if (isService) svcApproved += amount else partApproved += amount
                false -> if (isService) svcRejected += amount else partRejected += amount
                else -> if (isService) svcPending += amount else partPending += amount
            }
        }

        return QuoteBreakdown(
            services = CategoryTotals(svcApproved, svcPending, svcRejected),
            parts = CategoryTotals(partApproved, partPending, partRejected),
        )
    }

    fun breakdownForQuotes(quotes: List<PortalQuoteRow>): QuoteBreakdown {
        return breakdown(quotes.flatMap { it.lines })
    }

    fun displayAmount(quote: PortalQuoteRow): Double {
        if (quote.freeTextEnabled && quote.freeTextAmount != null) return quote.freeTextAmount
        return quote.amount
    }

    fun hasVisibleContent(quote: PortalQuoteRow): Boolean =
        quote.lines.isNotEmpty() || (quote.freeTextEnabled && (quote.freeTextAmount ?: 0.0) > 0)

    fun relevantQuotes(
        quotes: List<PortalQuoteRow>,
        activeServiceOrderId: String?,
    ): List<PortalQuoteRow> {
        val visible = quotes.filter { it.status.uppercase() != "DRAFT" && hasVisibleContent(it) }
        if (activeServiceOrderId == null) return visible
        val forOs = visible.filter { it.serviceOrder?.id == activeServiceOrderId }
        return forOs.ifEmpty { visible }
    }
}
