@echo off
REM 🚀 Fix Fogões - Inicialização Rápida para Windows
REM Este script inicia todos os serviços de desenvolvimento

echo.
echo ===============================================
echo    FIX FOGOES - DESENVOLVIMENTO COMPLETO
echo ===============================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado! Instale o Node.js primeiro.
    echo 💡 Download: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Python não encontrado! Instale o Python primeiro.
        echo 💡 Download: https://python.org/
        pause
        exit /b 1
    )
)

echo ✅ Node.js e Python encontrados!
echo.

REM Verificar se estamos no diretório correto
if not exist "package.json" (
    echo ❌ Arquivo package.json não encontrado!
    echo 💡 Execute este script na raiz do projeto Fix Fogões
    pause
    exit /b 1
)

echo 📦 Verificando dependências...

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo 🔄 Instalando dependências do projeto principal...
    npm install
)

if not exist "webhook-ai\node_modules" (
    echo 🔄 Instalando dependências do WhatsApp AI...
    cd webhook-ai
    npm install
    cd ..
)

if not exist "thermal-print-service\node_modules" (
    echo 🔄 Instalando dependências do Thermal Print...
    cd thermal-print-service
    npm install
    cd ..
)

echo.
echo 🚀 Iniciando todos os serviços...
echo.
echo 📋 SERVIÇOS:
echo    🌐 Frontend: http://localhost:8082
echo    🔧 API: http://localhost:3001  
echo    🤖 WhatsApp AI: http://localhost:3100
echo    🐍 Middleware: http://localhost:8000
echo    🖨️ Thermal Print: http://localhost:3002
echo.
echo ⚠️  Para parar todos os serviços, pressione Ctrl+C
echo.

REM Iniciar todos os serviços
npm run dev:all

echo.
echo 👋 Todos os serviços foram encerrados.
pause
