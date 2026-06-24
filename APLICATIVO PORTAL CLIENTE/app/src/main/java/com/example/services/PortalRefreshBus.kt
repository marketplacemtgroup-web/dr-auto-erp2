package com.example.services

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Sinaliza que o app deve buscar dados na API (ex.: após push FCM). */
object PortalRefreshBus {
    private val _requests = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val requests: SharedFlow<Unit> = _requests.asSharedFlow()

    fun requestRefresh() {
        _requests.tryEmit(Unit)
    }
}
