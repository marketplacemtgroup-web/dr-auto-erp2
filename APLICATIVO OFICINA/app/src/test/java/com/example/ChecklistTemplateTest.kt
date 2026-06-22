package com.example

import com.example.util.ChecklistTemplate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChecklistTemplateTest {
    @Test
    fun template_hasTwelveItems_matchingErp() {
        assertEquals(12, ChecklistTemplate.LABELS.size)
        assertEquals("Foto frente", ChecklistTemplate.LABELS.first())
        assertEquals("KM", ChecklistTemplate.LABELS.last())
    }

    @Test
    fun textOnlyLabels_matchErp() {
        assertTrue(ChecklistTemplate.isTextOnly("KM"))
        assertTrue(ChecklistTemplate.isTextOnly("Quantidade de combustível"))
        assertFalse(ChecklistTemplate.isTextOnly("Foto frente"))
        assertFalse(ChecklistTemplate.isTextOnly("Sulco pneu 1"))
    }
}
