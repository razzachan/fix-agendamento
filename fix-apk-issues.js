#!/usr/bin/env node

// ===================================================================
// 🔧 DIAGNÓSTICO E CORREÇÃO DE APK - FIX FOGÕES
// ===================================================================

import https from 'https';
import fs from 'fs';

console.log('🔍 Diagnosticando problemas do APK...');

// Verificar se o manifest está correto
console.log('\n📋 VERIFICANDO MANIFEST...');

const manifestOptions = {
  hostname: 'app.fixfogoes.com.br',
  port: 443,
  path: '/manifest.json',
  method: 'GET',
  headers: {
    'User-Agent': 'APK-Diagnostic/1.0'
  }
};

async function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
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

async function diagnoseAPK() {
  try {
    // Verificar manifest
    const manifestResponse = await makeRequest(manifestOptions);
    
    if (manifestResponse.statusCode === 200) {
      console.log('✅ Manifest acessível');
      const manifest = JSON.parse(manifestResponse.data);
      
      // Verificar campos obrigatórios
      console.log('\n🔍 VERIFICANDO CAMPOS OBRIGATÓRIOS:');
      
      const requiredFields = [
        'name', 'short_name', 'start_url', 'display', 
        'theme_color', 'background_color', 'icons'
      ];
      
      const missingFields = [];
      const presentFields = [];
      
      requiredFields.forEach(field => {
        if (manifest[field]) {
          presentFields.push(field);
          console.log(`✅ ${field}: ${typeof manifest[field] === 'object' ? 'presente' : manifest[field]}`);
        } else {
          missingFields.push(field);
          console.log(`❌ ${field}: AUSENTE`);
        }
      });
      
      // Verificar ícones
      console.log('\n🖼️ VERIFICANDO ÍCONES:');
      if (manifest.icons && manifest.icons.length > 0) {
        console.log(`✅ ${manifest.icons.length} ícones encontrados`);
        
        const requiredSizes = ['192x192', '512x512'];
        const availableSizes = manifest.icons.map(icon => icon.sizes);
        
        requiredSizes.forEach(size => {
          if (availableSizes.includes(size)) {
            console.log(`✅ Ícone ${size}: presente`);
          } else {
            console.log(`⚠️ Ícone ${size}: AUSENTE (recomendado)`);
          }
        });
      } else {
        console.log('❌ Nenhum ícone encontrado');
      }
      
      // Verificar se tem ID
      console.log('\n🆔 VERIFICANDO ID:');
      if (manifest.id) {
        console.log(`✅ ID: ${manifest.id}`);
      } else {
        console.log('⚠️ ID: AUSENTE (pode causar problemas)');
      }
      
      // Verificar orientação
      console.log('\n📱 VERIFICANDO ORIENTAÇÃO:');
      if (manifest.orientation) {
        const validOrientations = [
          'any', 'natural', 'landscape', 'landscape-primary', 
          'landscape-secondary', 'portrait', 'portrait-primary', 'portrait-secondary'
        ];
        
        if (validOrientations.includes(manifest.orientation)) {
          console.log(`✅ Orientação: ${manifest.orientation}`);
        } else {
          console.log(`❌ Orientação inválida: ${manifest.orientation}`);
        }
      } else {
        console.log('⚠️ Orientação: não especificada (usando padrão)');
      }
      
    } else {
      console.log(`❌ Erro ao acessar manifest: ${manifestResponse.statusCode}`);
    }
    
    // Soluções recomendadas
    console.log('\n🚀 SOLUÇÕES RECOMENDADAS:');
    console.log('');
    console.log('1. 📱 HABILITAR INSTALAÇÃO DE FONTES DESCONHECIDAS:');
    console.log('   - Configurações > Segurança > Fontes desconhecidas');
    console.log('   - Ou: Configurações > Apps > Acesso especial > Instalar apps desconhecidos');
    console.log('');
    console.log('2. 🔐 GERAR APK COM ASSINATURA VÁLIDA:');
    console.log('   - Use o PWA Builder com "New signing key"');
    console.log('   - Ou use o Google Play Console para upload');
    console.log('');
    console.log('3. 📋 CORRIGIR MANIFEST (se necessário):');
    console.log('   - Adicionar campo "id" obrigatório');
    console.log('   - Corrigir orientação se inválida');
    console.log('   - Verificar URLs dos ícones');
    console.log('');
    console.log('4. 🔄 ALTERNATIVAS DE INSTALAÇÃO:');
    console.log('   - Instalar via ADB: adb install app.apk');
    console.log('   - Usar APK Installer do Google Play');
    console.log('   - Testar em emulador primeiro');
    console.log('');
    console.log('5. 📊 VERIFICAR COMPATIBILIDADE:');
    console.log('   - Android 5.0+ (API 21+)');
    console.log('   - Arquitetura ARM/x86');
    console.log('   - Espaço suficiente (>50MB)');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
  }
}

// Executar diagnóstico
diagnoseAPK();
