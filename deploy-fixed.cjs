#!/usr/bin/env node

/**
 * =====================================================
 * SCRIPT DE DEPLOY CORRIGIDO PARA HOSTGATOR
 * =====================================================
 * Solução definitiva para problemas de FTP
 * =====================================================
 */

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Configurações FTP (via variáveis de ambiente)
const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false,
    port: Number(process.env.FTP_PORT || 21)
};

// Diretório remoto base (ex.: '/home2/USER/app.fixfogoes.com.br')
const REMOTE_BASE = process.env.FTP_REMOTE_BASE;
const LOCAL_DIST = process.env.LOCAL_DIST || './dist';

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[✅]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[❌]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[⚠️]\x1b[0m ${msg}`)
};

// Função para upload recursivo CORRIGIDA
async function uploadDirectoryFixed(client, localPath, remotePath) {
    const items = fs.readdirSync(localPath);

    for (const item of items) {
        const localItemPath = path.join(localPath, item);
        const stat = fs.statSync(localItemPath);

        if (stat.isDirectory()) {
            const remoteSubDir = `${remotePath}/${item}`;
            log.info(`📁 Criando diretório: ${remoteSubDir}`);

            try {
                // Garantir que o diretório existe
                await client.ensureDir(remoteSubDir);
                // Recursão para subdiretórios
                await uploadDirectoryFixed(client, localItemPath, remoteSubDir);
            } catch (e) {
                log.error(`❌ Erro ao criar diretório ${remoteSubDir}: ${e.message}`);
            }
        } else {
            log.info(`📄 Enviando: ${item}`);

            try {
                // CORREÇÃO: Navegar para o diretório correto primeiro
                await client.cd(remotePath);

                // Upload apenas com o nome do arquivo (sem caminho)
                await client.uploadFrom(localItemPath, item);
                log.success(`✅ Enviado: ${item}`);

            } catch (e) {
                log.error(`❌ Erro ao enviar ${item}: ${e.message}`);
            }
        }
    }
}

async function deployFixed() {
    console.log('\n🚀 DEPLOY CORRIGIDO PARA HOSTGATOR\n');

    try {
        // 1. Verificar se a pasta dist existe
        if (!fs.existsSync(LOCAL_DIST)) {
            log.error('❌ Pasta dist não encontrada! Execute npm run build primeiro.');
            return false;
        }
        log.success('📁 Pasta dist encontrada');

        // 1.1 Validar variáveis de ambiente obrigatórias
        if (!FTP_CONFIG.host || !FTP_CONFIG.user || !FTP_CONFIG.password) {
            log.error('❌ Variáveis FTP ausentes. Configure FTP_HOST, FTP_USER e FTP_PASSWORD.');
            return false;
        }
        if (!REMOTE_BASE) {
            log.error('❌ Variável FTP_REMOTE_BASE ausente. Ex.: /home2/USER/app.fixfogoes.com.br');
            return false;
        }

        // 2. Conectar ao FTP
        log.info('🌐 Conectando ao servidor FTP...');
        log.info(`📡 Servidor: ${FTP_CONFIG.host}`);
        log.info(`👤 Usuário: ${FTP_CONFIG.user}`);

        const client = new ftp.Client();
        client.ftp.timeout = 120000; // 2 minutos
        client.ftp.verbose = true;

        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP!');

        // 3. Navegar para o diretório base
        log.info(`📂 Navegando para: ${REMOTE_BASE}`);
        await client.ensureDir(REMOTE_BASE);
        await client.cd(REMOTE_BASE);
        log.success('📂 Navegado para diretório base');

        // 4. Upload dos arquivos
        log.info('📤 Iniciando upload dos arquivos...');
        await uploadDirectoryFixed(client, LOCAL_DIST, REMOTE_BASE);

        // 5. Fechar conexão
        client.close();

        console.log('\n🎉 DEPLOY CORRIGIDO CONCLUÍDO COM SUCESSO!');
        console.log('🌐 Site disponível em: https://app.fixfogoes.com.br');
        console.log('⏰ Aguarde alguns minutos para propagação');

        return true;

    } catch (error) {
        log.error('💥 Erro no deploy: ' + error.message);
        return false;
    }
}

// Executar deploy
if (require.main === module) {
    deployFixed().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { deployFixed };
