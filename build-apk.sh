#!/bin/bash

# ===================================================================
# 🔧 SCRIPT PARA GERAR APK ASSINADO - FIX FOGÕES
# ===================================================================

echo "🚀 Iniciando build do APK assinado para Fix Fogões..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale o npm primeiro."
    exit 1
fi

# Instalar Bubblewrap CLI globalmente se não estiver instalado
if ! command -v bubblewrap &> /dev/null; then
    echo "📦 Instalando Bubblewrap CLI..."
    npm install -g @bubblewrap/cli
fi

# Verificar se o Java está instalado
if ! command -v java &> /dev/null; then
    echo "❌ Java não encontrado. Instale o Java JDK 8 ou superior."
    exit 1
fi

# Verificar se o Android SDK está configurado
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME não configurado. Tentando localizar automaticamente..."
    
    # Tentar localizar o Android SDK em locais comuns
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo "✅ Android SDK encontrado em: $ANDROID_HOME"
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        echo "✅ Android SDK encontrado em: $ANDROID_HOME"
    else
        echo "❌ Android SDK não encontrado. Instale o Android Studio primeiro."
        exit 1
    fi
fi

# Adicionar ferramentas do Android ao PATH
export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"

# Navegar para o diretório dist
cd dist

# Gerar keystore se não existir
if [ ! -f "android.keystore" ]; then
    echo "🔐 Gerando keystore para assinatura..."
    keytool -genkey -v -keystore android.keystore -alias fixfogoes -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Fix Fogões, O=Fix Fogões, L=São Paulo, ST=SP, C=BR" \
        -storepass fixfogoes123 -keypass fixfogoes123
fi

# Inicializar projeto TWA
echo "🏗️  Inicializando projeto TWA..."
bubblewrap init --manifest=https://fixfogoes.netlify.app/manifest.json

# Fazer build do APK
echo "📱 Gerando APK..."
bubblewrap build

echo "✅ APK gerado com sucesso!"
echo "📍 Localização: ./app-release-signed.apk"

# Verificar se o APK foi gerado
if [ -f "app-release-signed.apk" ]; then
    echo "🎉 APK assinado gerado com sucesso!"
    echo "📊 Informações do APK:"
    ls -lh app-release-signed.apk
else
    echo "❌ Erro ao gerar APK. Verifique os logs acima."
    exit 1
fi
