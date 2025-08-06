# 📱 Como Gerar APK Assinado - Fix Fogões

## 🎯 **PROBLEMA RESOLVIDO**
O PWA agora está configurado para gerar APKs **ASSINADOS** em vez de "unsigned".

## 🔧 **ARQUIVOS CRIADOS/MODIFICADOS:**

### ✅ **Novos Arquivos:**
- `dist/twa-manifest.json` - Configuração específica para TWA
- `dist/assetlinks.json` - Verificação de domínio para Android
- `dist/bubblewrap.json` - Configuração do Bubblewrap CLI
- `build-apk.sh` - Script automatizado para gerar APK

### ✅ **Arquivos Modificados:**
- `dist/manifest.json` - Otimizado para TWA
- `dist/index.html` - Meta tags específicas para TWA
- `dist/sw.js` - Service Worker atualizado

## 🚀 **COMO GERAR APK ASSINADO:**

### **Método 1: Script Automatizado (Recomendado)**
```bash
# Execute o script
./build-apk.sh
```

### **Método 2: Manual**
```bash
# 1. Instalar Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Navegar para dist
cd dist

# 3. Inicializar TWA
bubblewrap init --manifest=https://fixfogoes.netlify.app/manifest.json

# 4. Gerar APK
bubblewrap build
```

## 📋 **PRÉ-REQUISITOS:**

### **Obrigatórios:**
- ✅ Node.js (v14+)
- ✅ npm ou yarn
- ✅ Java JDK 8+
- ✅ Android SDK (via Android Studio)

### **Configuração do Android SDK:**
```bash
# Definir variável de ambiente
export ANDROID_HOME=/caminho/para/android/sdk
export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH
```

## 🔐 **ASSINATURA DIGITAL:**

O script gera automaticamente um keystore com:
- **Alias:** fixfogoes
- **Senha:** fixfogoes123
- **Validade:** 10 anos

## 📊 **RESULTADO ESPERADO:**

Após executar o script, você terá:
- ✅ `app-release-signed.apk` - APK assinado e pronto para distribuição
- ✅ Tamanho aproximado: 1-2 MB
- ✅ Compatível com Android 5.0+

## 🔍 **VERIFICAÇÃO:**

Para verificar se o APK está assinado:
```bash
# Verificar assinatura
jarsigner -verify -verbose -certs app-release-signed.apk

# Informações do APK
aapt dump badging app-release-signed.apk
```

## 🌐 **DISTRIBUIÇÃO:**

### **Opções de Distribuição:**
1. **Google Play Store** - Distribuição oficial
2. **APK direto** - Instalação manual
3. **Firebase App Distribution** - Testes beta
4. **Amazon Appstore** - Loja alternativa

## 🆘 **SOLUÇÃO DE PROBLEMAS:**

### **Erro: "unsigned APK"**
- ✅ **RESOLVIDO** - Configuração TWA implementada

### **Erro: Android SDK não encontrado**
```bash
# Instalar Android Studio
# Configurar ANDROID_HOME
export ANDROID_HOME=/caminho/para/sdk
```

### **Erro: Java não encontrado**
```bash
# Instalar OpenJDK
sudo apt install openjdk-11-jdk  # Linux
brew install openjdk@11         # macOS
```

## 📞 **SUPORTE:**

Se ainda houver problemas:
1. Verifique os logs do build
2. Confirme que todos os pré-requisitos estão instalados
3. Execute o script em modo debug: `bash -x build-apk.sh`

---

**🎉 Agora o Fix Fogões gera APKs assinados profissionalmente!**
