@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM  PUBLICAR PENNAJUS - commit do rebranding + push p/ GitHub
REM  A Vercel detecta o push e faz o deploy automatico.
REM ============================================================

cd /d "%~dp0"
echo Pasta: %CD%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Aqui nao ha repositorio git.
  goto :fim
)

if exist ".git\index.lock" del /f /q ".git\index.lock"

git add -A
if errorlevel 1 (
  echo [ERRO] git add falhou.
  goto :fim
)

REM Trava de seguranca: nao commitar nenhum .env
git ls-files | findstr /I ".env" >nul
if not errorlevel 1 (
  echo [ABORTADO] Um arquivo .env entrou no commit. Verifique o .gitignore.
  goto :fim
)

echo Mudancas a enviar:
git status --short
echo.

git commit -m "feat: menu mobile no painel admin (hamburguer + gaveta AdminSidebar)"
if errorlevel 1 (
  echo [AVISO] Nada para commitar ou falha no commit.
  goto :fim
)

echo Enviando para o GitHub...
git push origin main
if errorlevel 1 (
  echo [ERRO] Push falhou. Se pediu login do GitHub, autorize e rode de novo.
  goto :fim
)

echo.
echo ============================================================
echo  PRONTO! A Vercel vai fazer o deploy automatico em instantes.
echo  Acompanhe em https://vercel.com (aba do projeto).
echo  Depois abra o site e confira a aguia PennaJus no ar!
echo ============================================================

:fim
echo.
pause
