package com.example.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.example.R

/** Tamanhos e opacidades padrão da marca no app. */
object PortalBranding {
    /** Logo 200% do tamanho anterior (2×). */
    const val LogoScale = 2f

    /** Véu sobre a foto de fundo (menor = imagem mais visível). Era 0.88f. */
    const val BackgroundOverlayAlpha = 0.58f

    val LogoHeightSplash = 160.dp
    val LogoHeightLogin = 144.dp
    val LogoHeightTopBar = 64.dp
    val LogoHeightDetailHeader = 80.dp
    val LogoAvatarBubble = 200.dp
}

/** Fundo fotográfico padrão do portal (mesmo asset do PWA: public/oficina do beto.png). */
@Composable
fun PortalBackground(
    modifier: Modifier = Modifier,
    showOverlay: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(BrandPalette.MetallicSilver),
    ) {
        Image(
            painter = painterResource(R.drawable.bg_oficina_beto),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            alignment = androidx.compose.ui.Alignment.TopCenter,
        )
        if (showOverlay) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BrandPalette.MetallicSilver.copy(alpha = PortalBranding.BackgroundOverlayAlpha))
            )
        }
        content()
    }
}

@Composable
fun PortalBrandLogo(
    modifier: Modifier = Modifier,
    @Suppress("UNUSED_PARAMETER") logoUrl: String? = null,
) {
    Image(
        painter = painterResource(R.drawable.logo_oficina_beto),
        contentDescription = "OFICINA DO BETO",
        modifier = modifier,
        contentScale = ContentScale.Fit,
    )
}
