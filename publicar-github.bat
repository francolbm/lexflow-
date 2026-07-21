@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

REM ============================================================
REM  Publicar Lexflow no GitHub (repo: francolbm/lexflow-)
REM  Basta dar duplo-clique neste arquivo.
REM ============================================================

cd /d "%~dp0"
echo.
echo Pasta do projeto: %CD%
echo Repositorio: https://github.com/francolbm/lexflow-.git
echo.

REM --- 0. Verificar se o git esta instalado ---
git --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Git nao encontrado no PATH. Instale o Git e tente de novo.
  goto :fim
)

REM --- 1. Limpar .git parcial de tentativas anteriores ---
if exist ".git" (
  echo Removendo .git anterior para comecar limpo...
  rmdir /s /q ".git"
)

REM --- 2. Inicializar repositorio ---
echo Inicializando repositorio git...
git init
git branch -M main

REM --- 2b. Garantir identidade do git (local, so neste repo) ---
REM Sem isso o commit falha com "please tell me who you are".
git config user.email "francolbm@gmail.com"
git config user.name "Franco Maciel"

REM --- 3. Preparar arquivos (respeitando o .gitignore) ---
git add -A

REM --- 4. TRAVA DE SEGURANCA: abortar se algum .env entrou ---
git ls-files | findstr /I ".env" >nul
if not errorlevel 1 (
  echo.
  echo [ABORTADO] Um arquivo .env foi incluido no commit.
  echo Isso exporia suas chaves. Verifique o .gitignore antes de continuar.
  git ls-files ^| findstr /I ".env"
  goto :fim
)

REM --- 5. Mostrar o que sera commitado ---
echo.
echo Arquivos que serao enviados:
git status --short
echo.

REM --- 6. Commit ---
git commit -m "Lexflow MVP: rotas de IA, extracao de anexos, correcoes de schema e RLS"
if errorlevel 1 (
  echo [ERRO] Falha no commit. Veja a mensagem acima.
  goto :fim
)

REM --- 7. Configurar o remote ---
git remote remove origin >nul 2>&1
git remote add origin https://github.com/francolbm/lexflow-.git

REM --- 8. Push ---
echo.
echo Enviando para o GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERRO] O push falhou. Causas comuns:
  echo   - Autenticacao: uma janela do navegador/GitHub pode pedir login.
  echo   - O repositorio ja tinha conteudo (nao era vazio).
  echo Rode o arquivo de novo apos resolver, ou me avise a mensagem de erro.
  goto :fim
)

echo.
echo ============================================================
echo  PRONTO! Codigo publicado em:
echo  https://github.com/francolbm/lexflow-
echo ============================================================

:fim
echo.
pause
