package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModelProvider
import com.example.ui.screens.MainAppContainer
import com.example.ui.theme.MyApplicationTheme
import com.example.viewmodel.AppViewModel

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: AppViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        viewModel = ViewModelProvider(this).get(AppViewModel::class.java)

        setContent {
            MyApplicationTheme {
                var activeScreen by remember { mutableStateOf("LOGIN") }
                val user by viewModel.currentUser.collectAsState()

                LaunchedEffect(user) {
                    activeScreen = if (user != null) "MAIN" else "LOGIN"
                }

                MainAppContainer(
                    viewModel = viewModel,
                    activeScreen = activeScreen,
                    onNavigate = { activeScreen = it }
                )
            }
        }
    }
}
