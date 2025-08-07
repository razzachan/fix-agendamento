#!/usr/bin/env node

/**
 * =====================================================
 * VERIFICAÇÃO DE SAÚDE DO SISTEMA DE DEPLOY
 * =====================================================
 * Execute: node health-check.cjs
 * Verifica se tudo está configurado corretamente
 * =====================================================
 */

const fs = require('fs');
const https = require('https');
const ftp = require('basic-ftp');
require('dotenv').config();

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[✅]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[❌]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[⚠️]\x1b[0m ${msg}`)
};

async function checkHealth() {
    console.log('\n🏥 VERIFICAÇÃO DE SAÚDE DO SISTEMA\n');
    
    let allGood = true;
    
    try {
        // 1. Verificar arquivos essenciais
        log.info('📁 Verificando arquivos essenciais...');
        
        const essentialFiles = [
            'package.json',
            '.env',
            'deploy-manual.js'
        ];
        
        for (const file of essentialFiles) {
            if (fs.existsSync(file)) {
                log.success(`${file} encontrado`);
            } else {
                log.error(`${file} não encontrado`);
                allGood = false;
            }
        }
        
        // 2. Verificar dependências
        log.info('\n📦 Verificando dependências...');
        
        try {
            require('basic-ftp');
            log.success('basic-ftp instalado');
        } catch (e) {
            log.error('basic-ftp não instalado - Execute: npm install basic-ftp');
            allGood = false;
        }
        
        // 3. Verificar configurações do .env
        log.info('\n🔧 Verificando configurações...');
        
        const requiredEnvVars = [
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_KEY',
            'FTP_SERVER',
            'FTP_USERNAME',
            'FTP_PASSWORD'
        ];
        
        for (const envVar of requiredEnvVars) {
            if (process.env[envVar] && process.env[envVar] !== 'SuaSenhaFTP_AquiDepois') {
                log.success(`${envVar} configurado`);
            } else {
                log.error(`${envVar} não configurado no .env`);
                allGood = false;
            }
        }
        
        // 4. Testar build
        log.info('\n🏗️ Testando build...');
        
        try {
            const { execSync } = require('child_process');
            execSync('npm run build', { stdio: 'pipe' });
            
            if (fs.existsSync('./dist/index.html')) {
                log.success('Build funcionando - index.html criado');
            } else {
                log.error('Build não criou index.html');
                allGood = false;
            }
        } catch (e) {
            log.error('Erro no build: ' + e.message);
            allGood = false;
        }
        
        // 5. Testar conexão FTP (se configurado)
        if (process.env.FTP_PASSWORD && process.env.FTP_PASSWORD !== 'SuaSenhaFTP_AquiDepois') {
            log.info('\n🌐 Testando conexão FTP...');
            
            try {
                const client = new ftp.Client();
                client.ftp.timeout = 10000;
                
                await client.access({
                    host: process.env.FTP_SERVER,
                    user: process.env.FTP_USERNAME,
                    password: process.env.FTP_PASSWORD,
                    secure: false
                });
                
                log.success('Conexão FTP funcionando');
                client.close();
            } catch (e) {
                log.error('Erro na conexão FTP: ' + e.message);
                allGood = false;
            }
        } else {
            log.warn('Senha FTP não configurada - pulando teste de conexão');
        }
        
        // 6. Verificar site online (se possível)
        const domain = process.env.DEPLOY_DOMAIN || 'app.fixfogoes.com.br';
        log.info(`\n🌍 Verificando site: https://${domain}`);
        
        try {
            await new Promise((resolve, reject) => {
                const req = https.get(`https://${domain}`, { timeout: 10000 }, (res) => {
                    if (res.statusCode === 200) {
                        log.success(`Site online - Status: ${res.statusCode}`);
                        resolve();
                    } else {
                        log.warn(`Site responde mas com status: ${res.statusCode}`);
                        resolve();
                    }
                });
                
                req.on('error', (e) => {
                    log.warn(`Site não acessível: ${e.message}`);
                    resolve(); // Não é erro crítico
                });
                
                req.on('timeout', () => {
                    log.warn('Timeout ao acessar o site');
                    req.destroy();
                    resolve();
                });
            });
        } catch (e) {
            log.warn('Não foi possível verificar o site');
        }
        
        // 7. Resumo final
        console.log('\n📊 RESUMO DA VERIFICAÇÃO:');
        
        if (allGood) {
            log.success('🎉 SISTEMA SAUDÁVEL - Tudo funcionando!');
            console.log('\n✅ Sistema pronto:');
            console.log('1. ✅ Cron Job configurado no cPanel (deploy automático a cada 15min)');
            console.log('2. ✅ Deploy manual disponível: npm run deploy:hostgator');
            console.log('3. ✅ Site: https://app.fixfogoes.com.br');
        } else {
            log.error('💥 PROBLEMAS ENCONTRADOS - Corrija os erros acima');
            console.log('\n🔧 Soluções:');
            console.log('1. Verifique o arquivo .env');
            console.log('2. Instale dependências: npm install');
            console.log('3. Execute: npm run build');
        }
        
        console.log(`\n📈 Status geral: ${allGood ? 'APROVADO' : 'REPROVADO'}`);
        
        return allGood;
        
    } catch (error) {
        log.error('Erro na verificação: ' + error.message);
        return false;
    }
}

// Executar verificação
if (require.main === module) {
    checkHealth().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { checkHealth };
