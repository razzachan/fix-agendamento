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

// Configurações FTP (USANDO CONTA PRINCIPAL MIRAGI67)
const FTP_CONFIG = {
    host: 'br594.hostgator.com.br',
    user: 'miragi67', // Conta principal com acesso total
    password: 'Shadowspirit!23', // Mesma senha (assumindo que é a mesma)
    secure: false,
    port: 21,
    secureOptions: {
        rejectUnauthorized: false
    }
};

const REMOTE_PATH = '/home2/miragi67/app.fixfogoes.com.br';
const LOCAL_DIST = './dist';

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[✅]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[❌]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[⚠️]\x1b[0m ${msg}`)
};

// Função para garantir que o diretório existe
async function ensureRemoteDir(client, dirPath) {
    try {
        await client.ensureDir(dirPath);
        return true;
    } catch (e) {
        log.warn(`Tentando criar diretório manualmente: ${dirPath}`);
        try {
            const parts = dirPath.split('/').filter(p => p);
            let currentPath = '';

            for (const part of parts) {
                currentPath += '/' + part;
                try {
                    await client.cd('/');
                    await client.ensureDir(currentPath);
                } catch (e2) {
                    // Diretório já existe, continuar
                }
            }
            return true;
        } catch (e2) {
            log.error(`Erro ao criar diretório ${dirPath}: ${e2.message}`);
            return false;
        }
    }
}

async function uploadDirectory(client, localPath, remotePath) {
    const items = fs.readdirSync(localPath);

    for (const item of items) {
        const localItemPath = path.join(localPath, item);
        const remoteItemPath = `${remotePath}/${item}`;

        const stat = fs.statSync(localItemPath);

        if (stat.isDirectory()) {
            log.info(`📁 Criando diretório: ${remoteItemPath}`);
            const dirCreated = await ensureRemoteDir(client, remoteItemPath);
            if (dirCreated) {
                await uploadDirectory(client, localItemPath, remoteItemPath);
            }
        } else {
            log.info(`📄 Enviando: ${item}`);
            try {
                // CORREÇÃO: Upload direto com caminho completo
                await client.uploadFrom(localItemPath, remoteItemPath);
                log.success(`✅ Enviado: ${item}`);
            } catch (e) {
                log.error(`❌ Erro ao enviar ${item}: ${e.message}`);
                // Tentar método alternativo
                try {
                    await client.cd(remotePath);
                    await client.uploadFrom(localItemPath, item);
                    log.success(`✅ Enviado (método alternativo): ${item}`);
                } catch (e2) {
                    log.error(`❌ Erro definitivo ao enviar ${item}: ${e2.message}`);
                }
            }
        }
    }
}

async function deployToHostGator() {
    console.log('\n🚀 INICIANDO DEPLOY PARA HOSTGATOR\n');
    
    try {
        // 1. Verificar se a pasta dist existe
        if (!fs.existsSync(LOCAL_DIST)) {
            log.error('Pasta dist não encontrada! Execute npm run build primeiro.');
            process.exit(1);
        }
        
        log.success('📁 Pasta dist encontrada');
        
        // 2. Verificar configurações FTP
        if (!FTP_CONFIG.password || FTP_CONFIG.password === 'SuaSenhaFTP_AquiDepois') {
            log.error('Senha FTP não configurada! Verifique o arquivo .env');
            process.exit(1);
        }
        
        log.success('🔧 Configurações FTP verificadas');
        
        // 3. Conectar ao FTP
        log.info('🌐 Conectando ao servidor FTP...');
        log.info(`📡 Servidor: ${FTP_CONFIG.host}`);
        log.info(`👤 Usuário: ${FTP_CONFIG.user}`);

        const client = new ftp.Client();
        client.ftp.timeout = 60000; // 60 segundos
        client.ftp.verbose = true; // Debug mode

        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP!');
        
        // 4. Navegar para o diretório correto
        log.info(`📂 Navegando para: ${REMOTE_PATH}`);
        await client.ensureDir(REMOTE_PATH);
        await client.cd(REMOTE_PATH);
        
        // 5. Upload dos arquivos
        log.info('📤 Iniciando upload dos arquivos...');
        await uploadDirectory(client, LOCAL_DIST, '.');
        
        // 6. Fechar conexão
        client.close();
        
        console.log('\n🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
        console.log('🌐 Site disponível em: https://app.fixfogoes.com.br');
        console.log('⏰ Aguarde alguns minutos para propagação');
        
        return true;
        
    } catch (error) {
        log.error('💥 Erro no deploy: ' + error.message);
        console.log('\n🔧 Soluções possíveis:');
        console.log('1. Verifique suas credenciais FTP no .env');
        console.log('2. Verifique sua conexão com a internet');
        console.log('3. Tente novamente em alguns minutos');
        
        return false;
    }
}

// Executar deploy
if (require.main === module) {
    deployToHostGator().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { deployToHostGator };
