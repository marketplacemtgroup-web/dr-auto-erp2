@echo off
title Otimizador Automatico - Rick Tech
color 0A

:: ================================
:: VERIFICAR ADMIN
:: ================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Execute como ADMINISTRADOR!
    pause
    exit
)

echo ========================================
echo   INICIANDO OTIMIZACAO AUTOMATICA...
echo ========================================
echo.

:: LOG
set log=%~dp0log_otimizacao.txt
echo [%date% %time%] Inicio >> %log%

:: ================================
:: LIMPEZA DE TEMPORARIOS
:: ================================
echo Limpando arquivos temporarios...
del /s /f /q %temp%\* >nul 2>&1
rd /s /q %temp% >nul 2>&1
mkdir %temp%

del /s /f /q C:\Windows\Temp\* >nul 2>&1

:: PREFETCH
del /s /f /q C:\Windows\Prefetch\* >nul 2>&1

echo [%date% %time%] Temporarios limpos >> %log%

:: ================================
:: LIMPEZA DE CACHE DNS
:: ================================
echo Limpando cache DNS...
ipconfig /flushdns >nul

:: ================================
:: OTIMIZACAO DE REDE
:: ================================
echo Otimizando rede...
netsh winsock reset >nul
netsh int ip reset >nul

echo [%date% %time%] Rede otimizada >> %log%

:: ================================
:: LIMPEZA DE LOGS
:: ================================
echo Limpando logs...
del /f /q C:\Windows\Logs\* >nul 2>&1

:: ================================
:: LIMPEZA DE LIXEIRA
:: ================================
echo Limpando lixeira...
PowerShell.exe -Command "Clear-RecycleBin -Force" >nul 2>&1

:: ================================
:: OTIMIZACAO DE SERVICOS
:: ================================
echo Ajustando servicos...

sc stop "DiagTrack" >nul 2>&1
sc config "DiagTrack" start= disabled >nul 2>&1

sc stop "SysMain" >nul 2>&1
sc config "SysMain" start= disabled >nul 2>&1

echo [%date% %time%] Servicos ajustados >> %log%

:: ================================
:: OTIMIZACAO DE DISCO
:: ================================
echo Otimizando disco...
defrag C: /O >nul

echo [%date% %time%] Disco otimizado >> %log%

:: ================================
:: FINAL
:: ================================
echo.
echo ========================================
echo   OTIMIZACAO FINALIZADA!
echo ========================================
echo.

echo [%date% %time%] Fim >> %log%

echo Recomenda-se reiniciar o computador.
pause
exit