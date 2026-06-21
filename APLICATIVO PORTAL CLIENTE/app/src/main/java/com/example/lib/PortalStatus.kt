package com.example.lib

object PortalStatus {
    private val FINISHED = setOf("FINISHED", "DELIVERED", "CANCELLED", "ENTREGUE", "FINALIZADA", "CANCELADA")

    fun isFinished(status: String): Boolean = FINISHED.contains(status.uppercase())

    fun isInProgress(status: String): Boolean = !isFinished(status)

    fun isAwaitingApproval(status: String): Boolean = status.uppercase() == "AWAITING_APPROVAL"
}
