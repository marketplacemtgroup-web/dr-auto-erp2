package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.AppButton
import com.example.ui.components.BetoLogo
import com.example.ui.components.BrandLogoSize
import com.example.ui.components.GlassSurface
import com.example.ui.components.GlassSurfaceElevated
import com.example.ui.components.InputField
import com.example.ui.theme.CrimsonRed
import com.example.ui.theme.FrostWhite
import com.example.ui.theme.MetallicSilver
import com.example.ui.theme.PremiumGold
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.LoginUiState

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    val state by viewModel.loginState.collectAsState()

    LaunchedEffect(state) {
        if (state is LoginUiState.Success) {
            onLoginSuccess()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
            Spacer(modifier = Modifier.height(16.dp))

            BetoLogo(size = BrandLogoSize.Login)

            Spacer(modifier = Modifier.height(28.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = GlassSurface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                border = BorderStroke(1.dp, PremiumGold.copy(alpha = 0.25f)),
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "ACESSO INTERNO",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = FrostWhite,
                            letterSpacing = 1.2.sp,
                        ),
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Box(
                            modifier = Modifier
                                .width(60.dp)
                                .height(1.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        colors = listOf(Color.Transparent, PremiumGold.copy(alpha = 0.5f)),
                                    ),
                                ),
                        )
                        Text(
                            text = " ÁREA LOGÍSTICA DA OFICINA ",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = PremiumGold,
                                fontWeight = FontWeight.Bold,
                                fontSize = 8.sp,
                                letterSpacing = 1.sp,
                            ),
                        )
                        Box(
                            modifier = Modifier
                                .width(60.dp)
                                .height(1.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        colors = listOf(PremiumGold.copy(alpha = 0.5f), Color.Transparent),
                                    ),
                                ),
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Painel para mecânicos e gestores",
                        style = MaterialTheme.typography.bodySmall.copy(color = MetallicSilver),
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    InputField(
                        value = email,
                        onValueChange = { email = it; viewModel.clearError() },
                        label = "E-mail ou Usuário",
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = "Email", tint = CrimsonRed)
                        },
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    InputField(
                        value = password,
                        onValueChange = { password = it; viewModel.clearError() },
                        label = "Senha",
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = "Senha", tint = CrimsonRed)
                        },
                        trailingIcon = {
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Ver senha",
                                    tint = MetallicSilver,
                                )
                            }
                        },
                        visualTransformation = if (isPasswordVisible) {
                            VisualTransformation.None
                        } else {
                            PasswordVisualTransformation()
                        },
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    AnimatedVisibility(visible = state is LoginUiState.Error) {
                        val errMsg = (state as? LoginUiState.Error)?.message ?: ""
                        Surface(
                            color = GlassSurfaceElevated,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp),
                        ) {
                            Text(
                                text = errMsg,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                                modifier = Modifier.padding(12.dp),
                            )
                        }
                    }

                    if (state is LoginUiState.Loading) {
                        CircularProgressIndicator(color = CrimsonRed, modifier = Modifier.size(24.dp))
                    } else {
                        AppButton(
                            text = "Entrar no Console",
                            onClick = { viewModel.login(email, password) },
                            testTag = "submit_login",
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    TextButton(onClick = { }) {
                        Text(
                            text = "Esqueci minha senha de trabalhador",
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = MetallicSilver,
                            ),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
    }
}
