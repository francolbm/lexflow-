@echo off
chcp 65001 >nul
cd /d "%~dp0"
title LexFlow - Servidor local (teste)
echo ============================================
echo    LexFlow - Subindo servidor de teste
echo ============================================
echo.
echo Modo simulado da IA: verifique se AI_MOCK=1 no .env.local
echo.
echo Quando aparecer  "Local: http://localhost:3000"  abaixo,
echo abra esse endereco no seu navegador.
echo Para PARAR o servidor: feche esta janela ou aperte Ctrl+C.
echo.
call npm run dev
pause
