#!/usr/bin/env node

/**
 * =====================================================
 * SCRIPT DE DEPLOY MANUAL PARA HOSTGATOR
 * =====================================================
 * Execute: npm run deploy:manual
 * Faz build local e envia via FTP para app.fixfogoes.com.br
 * =====================================================
 */

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Configurações
const FTP_CONFIG = {
    host: process.env.FTP_SERVER || 'ftp.fixfogoes.com.br',
    user: process.env.FTP_USERNAME || 'miragioc@fixfogoes.com.br',
    password: process.env.FTP_PASSWORD,
    secure: false,
    port: 21
};

const CPANEL_USER = process.env.CPANEL_USER || 'miragioc';
const DEPLOY_DOMAIN = process.env.DEPLOY_DOMAIN || 'app.fixfogoes.com.br';
const REMOTE_DIR = `/public_html/${DEPLOY_DOMAIN}/`;
const LOCAL_DIR = './dist/';

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`)
};

// Função para fazer build
async function buildProject() {
    log.info('🏗️  Fazendo build do projeto...');
    
    try {
        execSync('npm run build', { stdio: 'inherit' });
        log.success('✅ Build concluído com sucesso!');
        return true;
    } catch (error) {
        log.error('❌ Erro no build:', error.message);
        return false;
    }
}

// Função para verificar se a pasta dist existe
function checkDistFolder() {
    if (!fs.existsSync(LOCAL_DIR)) {
        log.error('❌ Pasta dist/ não encontrada. Execute o build primeiro.');
        return false;
    }
    
    const files = fs.readdirSync(LOCAL_DIR);
    if (files.length === 0) {
        log.error('❌ Pasta dist/ está vazia.');
        return false;
    }
    
    log.success(`✅ Pasta dist/ encontrada com ${files.length} arquivos.`);
    return true;
}

// Função para upload via FTP
async function uploadToFTP() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        log.info('🔌 Conectando ao servidor FTP...');
        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP com sucesso!');
        
        // Navegar para o diretório remoto
        log.info(`📁 Navegando para ${REMOTE_DIR}...`);
        await client.ensureDir(REMOTE_DIR);
        
        // Fazer backup do index.html atual (se existir)
        try {
            await client.rename('index.html', `index.html.backup.${Date.now()}`);
            log.info('💾 Backup do index.html atual criado.');
        } catch (e) {
            log.warn('⚠️  Nenhum index.html encontrado para backup.');
        }
        
        // Upload da pasta dist
        log.info('📤 Enviando arquivos...');
        await client.uploadFromDir(LOCAL_DIR, REMOTE_DIR);
        log.success('✅ Upload concluído com sucesso!');
        
        // Listar arquivos enviados
        const list = await client.list();
        log.info(`📋 Arquivos no servidor: ${list.length} itens`);
        
        client.close();
        
    } catch (error) {
        log.error('❌ Erro no upload FTP:', error.message);
        client.close();
        throw error;
    }
}

// Função principal
async function deploy() {
    console.log('\n🚀 INICIANDO DEPLOY MANUAL PARA HOSTGATOR\n');
    
    try {
        // Verificar credenciais FTP
        if (!FTP_CONFIG.password) {
            log.error('❌ Senha FTP não configurada. Defina FTP_PASSWORD no .env');
            process.exit(1);
        }
        
        // 1. Fazer build
        const buildSuccess = await buildProject();
        if (!buildSuccess) {
            process.exit(1);
        }
        
        // 2. Verificar pasta dist
        if (!checkDistFolder()) {
            process.exit(1);
        }
        
        // 3. Upload via FTP
        await uploadToFTP();
        
        console.log('\n🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
        console.log('🌐 Site disponível em: https://app.fixfogoes.com.br');
        console.log('⏰ Deploy realizado em:', new Date().toLocaleString('pt-BR'));
        
    } catch (error) {
        log.error('💥 Deploy falhou:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    deploy();
}

module.exports = { deploy };
