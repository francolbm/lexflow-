@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LexFlow - Instalar e Build
echo ============================================
echo    LexFlow - Instalar dependencias e Build
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

echo [1 de 2] Instalando dependencias ^(npm install^)...
echo Isso pode levar alguns minutos na primeira vez.
echo.
call npm install
if errorlevel 1 goto erro

echo.
echo [2 de 2] Gerando build de producao ^(npm run build^)...
echo.
call npm run build
if errorlevel 1 goto erro

echo.
echo ============================================
echo    SUCESSO! Build concluido sem erros.
echo    Proximo passo: testar com   npm run dev
echo ============================================
pause
exit /b 0

:erro
echo.
echo ============================================
echo    OCORREU UM ERRO no passo acima.
echo    Copie as ultimas linhas ^(em vermelho^)
echo    e me envie que eu te ajudo a resolver.
echo ============================================
pause
exit /b 1
