package com.example.lib

import com.example.types.PortalQuoteLine

object QuoteLineHelper {
    fun pendingLines(lines: List<PortalQuoteLine>): List<PortalQuoteLine> =
        lines.filter { it.approved == null }

    /** Igual ao `buildApprovePayload` do portal web. */
    fun buildApprovePayload(lines: List<PortalQuoteLine>): List<Pair<String, Boolean>>? {
        val pending = pendingLines(lines)
        val target = if (pending.isNotEmpty()) pending else lines
        if (target.isEmpty()) return null
        return target.map { it.id to true }
    }

    fun buildSelectionsPayload(
        lines: List<PortalQuoteLine>,
        selections: Map<String, Boolean>,
    ): List<Pair<String, Boolean>> {
        val pending = pendingLines(lines)
        val target = if (pending.isNotEmpty()) pending else lines
        return target.map { line ->
            line.id to (selections[line.id] ?: true)
        }
    }
}
