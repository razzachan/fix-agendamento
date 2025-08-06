#!/usr/bin/env node

/**
 * Script para configurar HTTPS local para desenvolvimento
 * Resolve problemas de permissão de câmera em dispositivos móveis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Configurando HTTPS para desenvolvimento...\n');

// Verificar se o mkcert está instalado
function checkMkcert() {
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Instalar mkcert
function installMkcert() {
  console.log('📦 Instalando mkcert...');
  
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      // Windows - usando chocolatey ou scoop
      try {
        execSync('choco install mkcert', { stdio: 'inherit' });
      } catch (error) {
        try {
          execSync('scoop install mkcert', { stdio: 'inherit' });
        } catch (error2) {
          console.log('❌ Erro: Instale o mkcert manualmente:');
          console.log('   1. Instale o Chocolatey: https://chocolatey.org/install');
          console.log('   2. Execute: choco install mkcert');
          console.log('   3. Ou baixe de: https://github.com/FiloSottile/mkcert/releases');
          process.exit(1);
        }
      }
    } else if (platform === 'darwin') {
      // macOS
      execSync('brew install mkcert', { stdio: 'inherit' });
    } else {
      // Linux
      console.log('❌ Instale o mkcert manualmente para Linux:');
      console.log('   https://github.com/FiloSottile/mkcert#installation');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Erro ao instalar mkcert:', error.message);
    process.exit(1);
  }
}

// Gerar certificados
function generateCertificates() {
  console.log('🔑 Gerando certificados SSL...');
  
  try {
    // Instalar CA local
    execSync('mkcert -install', { stdio: 'inherit' });
    
    // Gerar certificados para localhost e IP local
    const networkIP = getNetworkIP();
    const hosts = ['localhost', '127.0.0.1', networkIP].filter(Boolean).join(' ');
    
    execSync(`mkcert ${hosts}`, { stdio: 'inherit' });
    
    // Renomear arquivos para nomes padrão
    const certFiles = fs.readdirSync('.').filter(file => file.includes('+'));
    if (certFiles.length >= 2) {
      const keyFile = certFiles.find(file => file.includes('key'));
      const certFile = certFiles.find(file => !file.includes('key'));
      
      if (keyFile) fs.renameSync(keyFile, 'localhost-key.pem');
      if (certFile) fs.renameSync(certFile, 'localhost.pem');
    }
    
    console.log('✅ Certificados gerados com sucesso!');
    console.log(`📱 Acesse via HTTPS: https://${networkIP}:8082`);
    
  } catch (error) {
    console.log('❌ Erro ao gerar certificados:', error.message);
    process.exit(1);
  }
}

// Obter IP da rede local
function getNetworkIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '192.168.1.100'; // fallback
}

// Atualizar vite.config.ts
function updateViteConfig() {
  console.log('⚙️ Atualizando configuração do Vite...');
  
  const configPath = 'vite.config.ts';
  let config = fs.readFileSync(configPath, 'utf8');
  
  // Adicionar configuração HTTPS
  const httpsConfig = `
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    },`;
  
  // Verificar se já tem configuração HTTPS
  if (!config.includes('https:')) {
    // Adicionar import do fs
    if (!config.includes('import fs from')) {
      config = config.replace('import path from "path";', 'import path from "path";\nimport fs from "fs";');
    }
    
    // Adicionar configuração HTTPS no server
    config = config.replace(
      'cors: true, // Habilita CORS',
      `cors: true, // Habilita CORS${httpsConfig}`
    );
    
    fs.writeFileSync(configPath, config);
    console.log('✅ Configuração do Vite atualizada!');
  }
}

// Criar script de inicialização
function createStartScript() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['dev:https'] = 'vite --host 0.0.0.0 --port 8082';
  packageJson.scripts['dev:mobile'] = 'npm run dev:https';
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Scripts adicionados ao package.json:');
  console.log('   npm run dev:https  - Servidor HTTPS');
  console.log('   npm run dev:mobile - Alias para mobile');
}

// Função principal
function main() {
  console.log('🎯 SOLUÇÃO PARA PERMISSÃO DE CÂMERA NO MOBILE\n');
  console.log('Problema: Navegadores móveis só permitem câmera em HTTPS');
  console.log('Solução: Configurar HTTPS local com certificados válidos\n');
  
  // Verificar se mkcert está instalado
  if (!checkMkcert()) {
    console.log('⚠️ mkcert não encontrado. Instalando...');
    installMkcert();
  }
  
  // Verificar se certificados já existem
  if (fs.existsSync('localhost.pem') && fs.existsSync('localhost-key.pem')) {
    console.log('✅ Certificados já existem!');
  } else {
    generateCertificates();
  }
  
  updateViteConfig();
  createStartScript();
  
  console.log('\n🚀 CONFIGURAÇÃO COMPLETA!');
  console.log('\n📱 COMO USAR NO MOBILE:');
  console.log('1. Execute: npm run dev:https');
  console.log('2. Acesse: https://192.168.x.x:8082');
  console.log('3. Aceite o certificado no navegador');
  console.log('4. A câmera funcionará perfeitamente! 📸');
  console.log('\n💡 DICA: Salve o endereço HTTPS nos favoritos do mobile');
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, generateCertificates, updateViteConfig };
