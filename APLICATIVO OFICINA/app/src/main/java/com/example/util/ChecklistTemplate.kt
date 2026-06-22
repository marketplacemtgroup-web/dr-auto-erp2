package com.example.util

import com.example.data.model.ChecklistPhoto
import com.example.data.model.PhotoChecklistStatus

/** Alinhado a `apps/api/src/service-orders/checklist-template.ts` e ao ERP web. */
object ChecklistTemplate {
    val TEXT_ONLY_LABELS = emptySet<String>()

    val LABELS = listOf(
        "Foto dianteira",
        "Foto traseira",
        "Foto lateral direita",
        "Foto lateral esquerda",
        "Painel",
        "Teto",
    )

    fun isTextOnly(label: String): Boolean = label in TEXT_ONLY_LABELS

    fun textPlaceholder(label: String): String = "Informe o valor"

    fun isComplete(item: ChecklistPhoto): Boolean =
        if (isTextOnly(item.label)) {
            item.observation.isNotBlank()
        } else {
            item.status != PhotoChecklistStatus.PENDING
        }
}
