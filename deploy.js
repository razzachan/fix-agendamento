#!/usr/bin/env node

/**
 * Fix Fogões - Script de Deploy Automatizado
 * Cache Busting Definitivo para HostGator
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Fix Fogões - Deploy Script');
console.log('========================================');

// Configurações
const BUILD_DIR = 'dist';
const PACKAGE_JSON = 'package.json';

function updateVersion() {
  console.log('📦 Atualizando versão do projeto...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    const currentVersion = packageJson.version;
    const versionParts = currentVersion.split('.');
    
    // Incrementar patch version
    versionParts[2] = parseInt(versionParts[2]) + 1;
    const newVersion = versionParts.join('.');
    
    packageJson.version = newVersion;
    fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, 2));
    
    console.log(`✅ Versão atualizada: ${currentVersion} → ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error('❌ Erro ao atualizar versão:', error.message);
    process.exit(1);
  }
}

function cleanBuildDir() {
  console.log('🧹 Limpando diretório de build...');
  
  try {
    if (fs.existsSync(BUILD_DIR)) {
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
      console.log('✅ Diretório limpo');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar diretório:', error.message);
    process.exit(1);
  }
}

function buildProject() {
  console.log('🔨 Executando build do projeto...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build concluído com sucesso');
  } catch (error) {
    console.error('❌ Erro no build:', error.message);
    process.exit(1);
  }
}

function injectCacheBuster() {
  console.log('🔄 Injetando cache buster no HTML...');

  try {
    const indexPath = path.join(BUILD_DIR, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // Adicionar timestamp como meta tag
    const timestamp = Date.now();
    const cacheBusterMeta = `<meta name="cache-buster" content="${timestamp}">`;

    html = html.replace('<head>', `<head>\n    ${cacheBusterMeta}`);

    // Adicionar versão como comentário
    const version = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
    const versionComment = `<!-- Fix Fogões v${version} - Build: ${new Date().toISOString()} -->`;

    html = html.replace('<!DOCTYPE html>', `${versionComment}\n<!DOCTYPE html>`);

    fs.writeFileSync(indexPath, html);
    console.log(`✅ Cache buster injetado: ${timestamp}`);
  } catch (error) {
    console.error('❌ Erro ao injetar cache buster:', error.message);
    process.exit(1);
  }
}

function updateManifestVersion() {
  console.log('📱 Atualizando versão no manifest...');

  try {
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.version = packageJson.version;
      manifest.id = `fix-fogoes-app-v${packageJson.version}`;

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`✅ Manifest atualizado para v${packageJson.version}`);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar manifest:', error.message);
    process.exit(1);
  }
}

function generateDeployInfo() {
  console.log('📋 Gerando informações de deploy...');
  
  try {
    const version = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
    const deployInfo = {
      version: version,
      buildTime: new Date().toISOString(),
      buildTimestamp: Date.now(),
      environment: 'production',
      cacheStrategy: 'hash-based-busting'
    };
    
    fs.writeFileSync(
      path.join(BUILD_DIR, 'deploy-info.json'), 
      JSON.stringify(deployInfo, null, 2)
    );
    
    console.log('✅ Informações de deploy geradas');
    return deployInfo;
  } catch (error) {
    console.error('❌ Erro ao gerar informações:', error.message);
    process.exit(1);
  }
}

function showDeployInstructions(deployInfo) {
  console.log('\n🎯 INSTRUÇÕES PARA DEPLOY NO HOSTGATOR');
  console.log('========================================');
  console.log('1. Acesse o painel do HostGator');
  console.log('2. Vá para o Gerenciador de Arquivos');
  console.log('3. Navegue até public_html/');
  console.log('4. IMPORTANTE: Faça backup dos arquivos atuais');
  console.log('5. Delete todos os arquivos antigos do Fix Fogões');
  console.log('6. Faça upload de TODOS os arquivos da pasta dist/');
  console.log('7. Certifique-se que o .htaccess foi enviado');
  console.log('\n📊 Informações desta versão:');
  console.log(`   Versão: ${deployInfo.version}`);
  console.log(`   Build: ${deployInfo.buildTime}`);
  console.log(`   Cache Strategy: ${deployInfo.cacheStrategy}`);
  console.log('\n✅ Após o upload, teste em modo anônimo/incógnito');
  console.log('✅ Verifique se os assets têm hash nos nomes');
  console.log('✅ Confirme que não há erros no console');
}

// Executar deploy
async function main() {
  try {
    const version = updateVersion();
    cleanBuildDir();
    buildProject();
    injectCacheBuster();
    updateManifestVersion();
    const deployInfo = generateDeployInfo();

    console.log('\n🎉 DEPLOY PREPARADO COM SUCESSO!');
    showDeployInstructions(deployInfo);

  } catch (error) {
    console.error('\n❌ ERRO NO DEPLOY:', error.message);
    process.exit(1);
  }
}

main();
