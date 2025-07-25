@echo off
echo ========================================
echo Fix Fogoes - Instalador Servico Termico
echo ========================================
echo.

REM Verificar se Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo.
    echo Por favor, instale Node.js primeiro:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
node --version

echo.
echo 📦 Instalando dependencias...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo ✅ Dependencias instaladas com sucesso!
echo.
echo 🚀 Iniciando servico de teste...
echo.
echo Pressione Ctrl+C para parar o servico
echo Acesse: http://localhost:3001
echo.

call npm start
