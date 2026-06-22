package com.example

import com.example.util.ChecklistTemplate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ChecklistTemplateTest {
    @Test
    fun template_hasSixPhotoItems_matchingErp() {
        assertEquals(6, ChecklistTemplate.LABELS.size)
        assertEquals("Foto dianteira", ChecklistTemplate.LABELS.first())
        assertEquals("Teto", ChecklistTemplate.LABELS.last())
    }

    @Test
    fun noTextOnlyLabels() {
        assertFalse(ChecklistTemplate.isTextOnly("Foto dianteira"))
        assertFalse(ChecklistTemplate.isTextOnly("Painel"))
        assertFalse(ChecklistTemplate.isTextOnly("Teto"))
    }
}
