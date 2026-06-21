package com.example.ui.components

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.MetallicSilver
import com.example.util.AppPermissions

class VoiceInputHandler internal constructor(
    private val startRecognition: (onResult: (String) -> Unit) -> Unit,
) {
    fun listen(onResult: (String) -> Unit) = startRecognition(onResult)
}

@Composable
fun rememberVoiceInputHandler(): VoiceInputHandler {
    val context = LocalContext.current
    var pendingOnResult by remember { mutableStateOf<((String) -> Unit)?>(null) }
    var pendingAfterPermission by remember { mutableStateOf(false) }

    val speechLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val text = matches?.firstOrNull()?.trim().orEmpty()
            if (text.isNotEmpty()) {
                pendingOnResult?.invoke(text)
            }
        }
        pendingOnResult = null
    }

    fun launchRecognizer() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Fale agora...")
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        runCatching { speechLauncher.launch(intent) }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted && pendingAfterPermission) {
            pendingAfterPermission = false
            launchRecognizer()
        } else {
            pendingAfterPermission = false
            pendingOnResult = null
        }
    }

    return remember(speechLauncher, permissionLauncher) {
        VoiceInputHandler { onResult ->
            pendingOnResult = onResult
            if (AppPermissions.hasMicrophone(context)) {
                launchRecognizer()
            } else {
                pendingAfterPermission = true
                permissionLauncher.launch(AppPermissions.RECORD_AUDIO)
            }
        }
    }
}

@Composable
fun VoiceMicIconButton(
    onTranscript: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val voiceHandler = rememberVoiceInputHandler()
    IconButton(
        onClick = { voiceHandler.listen(onTranscript) },
        modifier = modifier,
        enabled = enabled,
    ) {
        Icon(
            imageVector = Icons.Default.Mic,
            contentDescription = "Ditado por voz",
            tint = if (enabled) CrimsonRed else MetallicSilver,
        )
    }
}

fun appendVoiceTranscript(current: String, transcript: String): String {
    if (current.isBlank()) return transcript
    val separator = if (current.endsWith(' ') || current.endsWith('\n')) "" else " "
    return current + separator + transcript
}

@Composable
fun VoiceTextFieldTrailingIcon(
    value: String,
    onValueChange: (String) -> Unit,
    append: Boolean = true,
) {
    VoiceMicIconButton(
        onTranscript = { transcript ->
            onValueChange(
                if (append) appendVoiceTranscript(value, transcript) else transcript,
            )
        },
    )
}
