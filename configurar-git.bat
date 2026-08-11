@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   Configurar login PERMANENTE do Git (GitHub)
echo ============================================================
echo.
echo Antes de continuar: crie o token (PAT) no GitHub seguindo o
echo arquivo CONFIGURAR_LOGIN_GIT.md (nesta pasta).
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"

REM Faz o Git salvar as credenciais de forma persistente (nao expira).
REM O valor vazio zera a lista de helpers (inclusive um do sistema) e
REM depois definimos apenas o "store".
git config --global credential.helper ""
git config --global --add credential.helper store
git config user.email "francolbm@gmail.com"
git config user.name "Franco Maciel"

echo Vou enviar um commit de teste (vazio) so para ativar o login.
echo.
echo Quando o console perguntar:
echo    Username for 'https://github.com':   digite  francolbm   e Enter
echo    Password for ... :                   COLE o seu TOKEN (PAT) e Enter
echo    (para colar no console, clique com o BOTAO DIREITO do mouse)
echo.
pause

git commit --allow-empty -m "chore: configurar credencial persistente do git"
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Nao consegui enviar. Confira o usuario/token e rode de novo.
  goto :fim
)

echo.
echo ============================================================
echo   PRONTO! Login salvo. A partir de agora o Git NAO pede mais
echo   autenticacao nos proximos envios (empurrar / enviar-...).
echo ============================================================

:fim
echo.
pause
