#!/bin/bash
# 🚀 Fix Fogões - Inicialização Rápida para Linux/Mac
# Este script inicia todos os serviços de desenvolvimento

echo ""
echo "==============================================="
echo "   FIX FOGOES - DESENVOLVIMENTO COMPLETO"
echo "==============================================="
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado! Instale o Node.js primeiro."
    echo "💡 Download: https://nodejs.org/"
    exit 1
fi

# Verificar se Python está instalado
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python não encontrado! Instale o Python primeiro."
    echo "💡 Download: https://python.org/"
    exit 1
fi

echo "✅ Node.js e Python encontrados!"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Arquivo package.json não encontrado!"
    echo "💡 Execute este script na raiz do projeto Fix Fogões"
    exit 1
fi

echo "📦 Verificando dependências..."

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "🔄 Instalando dependências do projeto principal..."
    npm install
fi

if [ ! -d "webhook-ai/node_modules" ]; then
    echo "🔄 Instalando dependências do WhatsApp AI..."
    cd webhook-ai
    npm install
    cd ..
fi

if [ ! -d "thermal-print-service/node_modules" ]; then
    echo "🔄 Instalando dependências do Thermal Print..."
    cd thermal-print-service
    npm install
    cd ..
fi

echo ""
echo "🚀 Iniciando todos os serviços..."
echo ""
echo "📋 SERVIÇOS:"
echo "   🌐 Frontend: http://localhost:8082"
echo "   🔧 API: http://localhost:3001"  
echo "   🤖 WhatsApp AI: http://localhost:3100"
echo "   🐍 Middleware: http://localhost:8000"
echo "   🖨️ Thermal Print: http://localhost:3002"
echo ""
echo "⚠️  Para parar todos os serviços, pressione Ctrl+C"
echo ""

# Tornar o script executável
chmod +x "$0"

# Iniciar todos os serviços
npm run dev:all

echo ""
echo "👋 Todos os serviços foram encerrados."
