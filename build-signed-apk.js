#!/usr/bin/env node

// ===================================================================
// 🔧 GERADOR DE APK ASSINADO COM CHAVE EXISTENTE - FIX FOGÕES
// ===================================================================

import https from 'https';

console.log('🚀 Gerando APK assinado com chave da versão 3.6...');

// Configuração com dados da versão que funcionava
const config = {
  url: 'https://app.fixfogoes.com.br',
  packageId: 'br.com.fixfogoes.app.twa',
  name: 'Fix Fogões',
  keystore: {
    file: 'signing.keystore',
    password: 'wSnSKnuHEcky',
    alias: 'my-key-alias',
    keyPassword: 'wSnSKnuHEcky'
  },
  fingerprint: 'F4:A4:CC:98:E7:8A:72:26:5F:CD:FA:20:25:68:AF:B1:FD:20:95:0F:53:DA:A0:48:C2:24:0A:D9:84:51:A9:45'
};

console.log('📋 CONFIGURAÇÃO CORRETA APLICADA:');
console.log(`   Package ID: ${config.packageId}`);
console.log(`   URL: ${config.url}`);
console.log(`   Keystore: ${config.keystore.file}`);
console.log(`   Alias: ${config.keystore.alias}`);
console.log(`   Fingerprint: ${config.fingerprint}`);

// Verificar se o manifest está acessível
console.log('\n🔍 Verificando manifest...');

const manifestOptions = {
  hostname: 'app.fixfogoes.com.br',
  port: 443,
  path: '/manifest.json',
  method: 'GET',
  headers: {
    'User-Agent': 'APK-Builder/1.0'
  }
};

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function buildAPK() {
  try {
    const manifestResponse = await makeRequest(manifestOptions);
    
    if (manifestResponse.statusCode === 200) {
      console.log('✅ Manifest acessível');
      
      const manifest = JSON.parse(manifestResponse.data);
      console.log(`✅ Nome: ${manifest.name}`);
      console.log(`✅ ID: ${manifest.id || 'presente'}`);
      console.log(`✅ Display: ${manifest.display}`);
      console.log(`✅ Ícones: ${manifest.icons?.length || 0} encontrados`);
      
      console.log('\n🎯 INSTRUÇÕES PARA PWA BUILDER:');
      console.log('');
      console.log('1. 🌐 Acesse: https://www.pwabuilder.com/');
      console.log(`2. 📝 Cole a URL: ${config.url}`);
      console.log('3. ⚡ Clique em "Start"');
      console.log('4. 📦 Clique em "Package For Stores"');
      console.log('5. 🤖 Selecione "Android" > "Generate Package"');
      console.log('');
      console.log('📋 CONFIGURAÇÕES OBRIGATÓRIAS:');
      console.log(`   Package ID: ${config.packageId}`);
      console.log('   App name: Fix Fogões');
      console.log('   Short name: Fix Fogões');
      console.log('   Display mode: Fullscreen');
      console.log('   Signing key: Use mine');
      console.log('');
      console.log('🔐 DADOS DA CHAVE DE ASSINATURA:');
      console.log(`   Keystore file: ${config.keystore.file}`);
      console.log(`   Keystore password: ${config.keystore.password}`);
      console.log(`   Key alias: ${config.keystore.alias}`);
      console.log(`   Key password: ${config.keystore.keyPassword}`);
      console.log('');
      console.log('✅ RESULTADO ESPERADO:');
      console.log('   - APK assinado com a mesma chave da versão 3.6');
      console.log('   - Compatível com instalações existentes');
      console.log('   - Sem erro "pacote inválido"');
      console.log('   - Modo fullscreen ativo');
      
    } else {
      console.log(`❌ Erro ao acessar manifest: ${manifestResponse.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

buildAPK();
