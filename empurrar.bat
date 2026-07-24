@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo Pasta: %CD%
echo.
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo Estado antes do push:
git status -sb
echo.
echo Enviando commits locais para o GitHub...
echo (Se abrir uma janela de login do GitHub, faca o login / Authorize.)
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] O push falhou. Se pediu login e nao apareceu, tente de novo.
  goto :fim
)
echo.
echo ============================================================
echo  PRONTO! Push enviado. A Vercel vai iniciar um novo deploy.
echo ============================================================
:fim
echo.
pause
