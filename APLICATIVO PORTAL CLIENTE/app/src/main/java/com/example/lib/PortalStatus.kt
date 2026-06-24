package com.example.lib

import com.example.types.PortalQuoteLine
import com.example.types.PortalQuoteRow

object PortalStatus {
    private val FINISHED_STATUSES = setOf("FINISHED", "DELIVERED", "CANCELLED")

    fun isFinished(status: String): Boolean =
        FINISHED_STATUSES.contains(status.uppercase())

    fun isInProgress(status: String): Boolean = !isFinished(status)

    fun isAwaitingApproval(status: String): Boolean =
        status.uppercase() == "AWAITING_APPROVAL"

    fun osStatusLabel(status: String): String {
        val labels = mapOf(
            "RECEIVED" to "Recebido",
            "DIAGNOSIS" to "Diagnóstico",
            "AWAITING_QUOTE" to "Aguardando orçamento",
            "AWAITING_APPROVAL" to "Aguardando aprovação",
            "APPROVED" to "Aprovado",
            "IN_PROGRESS" to "Em execução",
            "AWAITING_PART" to "Aguardando peça",
            "PAUSED" to "Pausada",
            "AWAITING_PAYMENT" to "Aguardando pagamento",
            "FINISHED" to "Finalizado",
            "DELIVERED" to "Entregue",
            "CANCELLED" to "Cancelado",
        )
        return labels[status.uppercase()] ?: status
    }

    fun quoteStatusLabel(status: String): String {
        val labels = mapOf(
            "DRAFT" to "Rascunho",
            "PENDING" to "Pendente",
            "APPROVED" to "Aprovado",
            "REJECTED" to "Recusado",
        )
        return labels[status.uppercase()] ?: status
    }

    private fun lineNeedsResponse(line: PortalQuoteLine): Boolean =
        line.approved == null

    fun quoteNeedsResponse(quote: PortalQuoteRow): Boolean {
        if (!quote.canRespond) return false
        if (quote.status.uppercase() != "PENDING") return false
        val lines = quote.lines
        if (lines.isEmpty()) {
            return quote.freeTextEnabled && (quote.freeTextAmount ?: quote.amount) > 0
        }
        if (quote.pendingLineCount <= 0) return false
        return lines.any { lineNeedsResponse(it) }
    }

    fun hasPendingQuote(quotes: List<PortalQuoteRow>, serviceOrderId: String): Boolean =
        quotes.any { q ->
            q.serviceOrder?.id == serviceOrderId && quoteNeedsResponse(q)
        }
}
