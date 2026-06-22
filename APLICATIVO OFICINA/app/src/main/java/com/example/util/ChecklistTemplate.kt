package com.example.util

import com.example.data.model.ChecklistPhoto
import com.example.data.model.PhotoChecklistStatus

/** Alinhado a `apps/api/src/service-orders/checklist-template.ts` e ao ERP web. */
object ChecklistTemplate {
    val TEXT_ONLY_LABELS = setOf(
        "Quantidade de combustível",
        "KM",
    )

    val LABELS = listOf(
        "Foto frente",
        "Foto traseira",
        "Foto lado direito",
        "Foto lado esquerdo",
        "Chassis",
        "Painel",
        "Sulco pneu 1",
        "Sulco pneu 2",
        "Sulco pneu 3",
        "Sulco pneu 4",
        "Quantidade de combustível",
        "KM",
    )

    fun isTextOnly(label: String): Boolean = label in TEXT_ONLY_LABELS

    fun textPlaceholder(label: String): String = when (label) {
        "KM" -> "Ex: 45000"
        "Quantidade de combustível" -> "Ex: 1/2 tanque"
        else -> "Informe o valor"
    }

    fun isComplete(item: ChecklistPhoto): Boolean =
        if (isTextOnly(item.label)) {
            item.observation.isNotBlank()
        } else {
            item.status != PhotoChecklistStatus.PENDING
        }
}
