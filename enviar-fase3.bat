@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM  Enviar a UI da Fase 3 (selo "Responsavel") ao GitHub.
REM  Da duplo-clique.
REM ============================================================

cd /d "%~dp0"
echo Pasta: %CD%
echo.

if exist ".git\index.lock" (
  echo Removendo .git\index.lock preso...
  del /f /q ".git\index.lock"
)

git config user.email "francolbm@gmail.com"
git config user.name "Franco Maciel"

git add -A
if errorlevel 1 (
  echo [ERRO] git add falhou.
  goto :fim
)

git ls-files | findstr /I ".env" >nul
if not errorlevel 1 (
  echo [ABORTADO] Um arquivo .env entrou no commit. Verifique o .gitignore.
  git ls-files ^| findstr /I ".env"
  goto :fim
)

echo Arquivos que serao enviados:
git status --short
echo.

git commit -m "Fase 3: selo de Advogado responsavel na tela de membros (trava de banco ja aplicada)"
if errorlevel 1 (
  echo [AVISO] Nada para commitar ou falha no commit.
  goto :fim
)

echo Enviando para o GitHub...
git push origin main
if errorlevel 1 (
  echo [ERRO] Push falhou. Veja a mensagem acima.
  goto :fim
)

echo.
echo ============================================================
echo  PRONTO! Push enviado. A Vercel vai iniciar um novo deploy.
echo ============================================================

:fim
echo.
pause
