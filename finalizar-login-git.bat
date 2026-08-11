@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   Finalizar login do Git e enviar commits pendentes
echo ============================================================
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"

REM Forca o Git a usar SOMENTE o login salvo (store), removendo os
REM demais metodos que causavam o "multiple values".
git config --global --replace-all credential.helper store

echo Login ajustado. Enviando os commits pendentes...
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Ainda nao enviou. Me avise o que apareceu acima.
  goto :fim
)

echo.
echo ============================================================
echo   PRONTO! Commits enviados. O Git NAO vai mais pedir login
echo   nos proximos envios (empurrar / enviar-...).
echo ============================================================

:fim
echo.
pause
