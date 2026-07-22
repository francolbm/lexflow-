@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM  Atualizar o repositorio no GitHub (commit + push incremental).
REM  Use este depois do primeiro publish. Da duplo-clique.
REM ============================================================

cd /d "%~dp0"
echo Pasta: %CD%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Aqui nao ha repositorio git. Rode primeiro o publicar-github.bat.
  goto :fim
)

REM Remove lock preso de processos anteriores (senao o git nao roda)
if exist ".git\index.lock" (
  echo Removendo .git\index.lock preso...
  del /f /q ".git\index.lock"
)

git add -A
if errorlevel 1 (
  echo [ERRO] git add falhou. Pode haver outro processo git aberto.
  goto :fim
)

REM Trava de seguranca: nao commitar nenhum .env
git ls-files | findstr /I ".env" >nul
if not errorlevel 1 (
  echo [ABORTADO] Um arquivo .env entrou no commit. Verifique o .gitignore.
  git ls-files ^| findstr /I ".env"
  goto :fim
)

echo Mudancas a enviar:
git status --short
echo.

git commit -m "fix: declaracao de tipo do subpath do pdf-parse (corrige build na Vercel)"
if errorlevel 1 (
  echo [AVISO] Nada para commitar ou falha no commit. Veja acima.
  goto :fim
)

echo Enviando para o GitHub...
git push
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
