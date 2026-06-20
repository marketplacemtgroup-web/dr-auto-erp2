package com.example.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import com.example.R
import com.example.ui.theme.DarkBg

/**
 * Fundo fotográfico da oficina com scrim escuro para garantir contraste
 * de textos, cards e campos sobre a imagem.
 */
@Composable
fun WorkshopBackground(
    modifier: Modifier = Modifier,
    scrimAlpha: Float = 0.55f,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.bg_oficina_beto),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black.copy(alpha = scrimAlpha + 0.05f),
                            0.35f to Color.Black.copy(alpha = scrimAlpha),
                            0.7f to DarkBg.copy(alpha = scrimAlpha),
                            1.0f to Color.Black.copy(alpha = scrimAlpha + 0.08f),
                        ),
                    ),
                ),
        )
        content()
    }
}

/** Superfície semi-opaca para cards sobre foto de fundo. */
val GlassSurface = Color(0xF016181C)
val GlassSurfaceElevated = Color(0xF82A2D33)
