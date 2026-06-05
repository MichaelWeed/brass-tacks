@echo off
:: Brass Tacks Windows Launcher (WSL2-based)
title Brass Tacks Launcher

:: Check for WSL
where wsl >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] WSL2 (Windows Subsystem for Linux) could not be found.
    echo Please install WSL2 and Podman to run Brass Tacks on Windows.
    pause
    exit /b 1
)

:: Get current directory in WSL format
for /f "tokens=*" %%i in ('wsl wslpath -u "%~dp0..\.."') do set WSL_PATH=%%i

echo Starting Brass Tacks services inside WSL2...
wsl bash -c "cd '%WSL_PATH%' && ./start.sh"

pause
