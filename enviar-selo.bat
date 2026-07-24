@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo Pasta: %CD%
echo.
if exist ".git\index.lock" del /f /q ".git\index.lock"
git config user.email "francolbm@gmail.com"
git config user.name "Franco Maciel"
git add -A
if errorlevel 1 ( echo [ERRO] git add falhou. & goto :fim )
git ls-files | findstr /I ".env" >nul
if not errorlevel 1 ( echo [ABORTADO] Um .env entrou no commit. & goto :fim )
echo Arquivos que serao enviados:
git status --short
echo.
git commit -m "Landing: selo Mais Popular fora do Card (corrige corte pelo overflow-hidden)"
if errorlevel 1 ( echo [AVISO] Nada para commitar. & goto :fim )
echo Enviando para o GitHub...
git push origin main
if errorlevel 1 ( echo [ERRO] Push falhou (se pedir login, faca o login). & goto :fim )
echo.
echo ============================================================
echo  PRONTO! Push enviado. A Vercel vai iniciar um novo deploy.
echo ============================================================
:fim
echo.
pause
