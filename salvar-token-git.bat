@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ============================================================
echo   Salvar o token do GitHub (login permanente do Git)
echo ============================================================
echo.
echo Cole o token abaixo. Aqui o texto APARECE (fica mais facil).
echo Para colar: clique com o BOTAO DIREITO do mouse, depois Enter.
echo.

set "TOKEN="
set /p "TOKEN=Cole o seu token do GitHub e aperte Enter: "

if "!TOKEN!"=="" (
  echo.
  echo [ERRO] Nenhum token informado. Rode de novo e cole o token.
  goto :fim
)

REM Configura o Git para guardar credenciais de forma persistente
git config --global credential.helper ""
git config --global --add credential.helper store
git config --global user.email "francolbm@gmail.com"
git config --global user.name "Franco Maciel"

REM Grava a credencial (usuario:token) para o github.com
> "%USERPROFILE%\.git-credentials" echo https://francolbm:!TOKEN!@github.com

echo.
echo Credencial salva em: %USERPROFILE%\.git-credentials
echo.
echo Testando o acesso ao repositorio...
git ls-remote https://github.com/francolbm/lexflow-.git HEAD >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Nao consegui confirmar o acesso. Verifique se o token
  echo         tem permissao "repo" e se foi colado inteiro.
) else (
  echo [OK] Acesso confirmado!
)

echo.
echo ============================================================
echo   PRONTO! Agora rode o empurrar.bat (ou enviar-...) que o Git
echo   NAO vai mais pedir login.
echo ============================================================

:fim
echo.
pause
