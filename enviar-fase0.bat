@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM  Enviar as correcoes da Fase 0 para o GitHub.
REM  Faz um push forcado para alinhar o repositorio local com o
REM  remoto (o commit inclui todos os arquivos, entao nada se perde).
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

REM Trava de seguranca: nunca commitar um .env
git ls-files | findstr /I ".env" >nul
if not errorlevel 1 (
  echo [ABORTADO] Um arquivo .env entrou no commit. Verifique o .gitignore.
  git ls-files ^| findstr /I ".env"
  goto :fim
)

echo Arquivos que serao enviados:
git status --short
echo.

git commit -m "Fase 0: corrige papeis app_role (admin/lawyer/assistant) no cadastro e membros; subscription por org; tipo do subpath pdf-parse"
if errorlevel 1 (
  echo [AVISO] Nada para commitar ou falha no commit.
  goto :fim
)

echo Enviando para o GitHub (push --force para alinhar com o remoto)...
git push -f origin main
if errorlevel 1 (
  echo [ERRO] Push falhou. Veja a mensagem acima.
  goto :fim
)

echo.
echo ============================================================
echo  PRONTO! Push enviado. A Vercel vai iniciar um novo deploy
echo  automaticamente em alguns segundos.
echo ============================================================

:fim
echo.
pause
