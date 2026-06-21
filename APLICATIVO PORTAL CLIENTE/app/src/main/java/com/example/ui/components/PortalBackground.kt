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
import com.example.R

/** Fundo fotográfico padrão do portal (mesmo asset do PWA: public/oficina do beto.png). */
@Composable
fun PortalBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF4F6F9)),
    ) {
        Image(
            painter = painterResource(R.drawable.bg_oficina_beto),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            alignment = androidx.compose.ui.Alignment.TopCenter,
        )
        content()
    }
}

@Composable
fun PortalBrandLogo(
    modifier: Modifier = Modifier,
) {
    Image(
        painter = painterResource(R.drawable.logo_oficina_beto),
        contentDescription = "OFICINA DO BETO",
        modifier = modifier,
        contentScale = ContentScale.Fit,
    )
}
