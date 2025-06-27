#!/bin/bash

# ===================================================================
# 🚀 SCRIPT DE DEPLOY - FIX FOGÕES
# ===================================================================

echo "🔥 Iniciando deploy do Fix Fogões..."

# Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist/

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Build para produção
echo "🏗️ Fazendo build para produção..."
npm run build

# Verificar se build foi criado
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build não foi criado!"
    exit 1
fi

echo "✅ Build criado com sucesso!"

# Mostrar tamanho dos arquivos
echo "📊 Tamanho dos arquivos:"
du -sh dist/

# Listar arquivos principais
echo "📁 Arquivos principais:"
ls -la dist/

echo ""
echo "🎉 Deploy preparado com sucesso!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. 🌐 Compre um domínio (ex: fixfogoes.com.br)"
echo "2. 🏠 Configure hospedagem com HTTPS"
echo "3. 📤 Faça upload da pasta 'dist/' para o servidor"
echo "4. 📱 Use PWA Builder para gerar APK"
echo ""
echo "🔗 Sugestões de hospedagem:"
echo "- Vercel (grátis com HTTPS automático)"
echo "- Netlify (grátis com HTTPS automático)"
echo "- Hostinger (pago, domínio .com.br)"
echo "- UOL Host (pago, domínio .com.br)"
