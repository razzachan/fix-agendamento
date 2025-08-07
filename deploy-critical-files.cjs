#!/usr/bin/env node

/**
 * =====================================================
 * SCRIPT PARA ENVIAR APENAS ARQUIVOS CRÍTICOS
 * =====================================================
 * Envia apenas JS/CSS essenciais que faltaram
 * =====================================================
 */

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Configurações FTP
const FTP_CONFIG = {
    host: 'br594.hostgator.com.br',
    user: 'miragi67',
    password: 'Shadowspirit!23',
    secure: false,
    port: 21
};

const REMOTE_BASE = '/home2/miragi67/app.fixfogoes.com.br';
const LOCAL_DIST = './dist';

// Arquivos críticos que precisam ser enviados
const CRITICAL_FILES = [
    'assets/index-DhUf2O5w.js',
    'assets/index-83-L6JCf.css',
    'assets/vendor-BJaCQb1B-Cbr5T7rF.js',
    'assets/charts-B0ZRp5vW-CsJwuvNu.js',
    'assets/maps-DgedmEtj-ex3DfE3h.js',
    'assets/ui-Dn8Aqb0j-DnN0Mb9-.js',
    'assets/utils-mnyH58Xp-D78SC-Vr.js',
    'assets/index.es-y-Hft5Mi-DPsgpwXH.js',
    'assets/purify.es-BFmuJLeH-DF-2v9nT.js',
    'assets/browser-ld2k7RX1-BGoHzAsy.js'
];

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[✅]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[❌]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[⚠️]\x1b[0m ${msg}`)
};

async function uploadCriticalFiles() {
    console.log('\n🚀 ENVIANDO ARQUIVOS CRÍTICOS PARA HOSTGATOR\n');
    
    try {
        // 1. Conectar ao FTP
        log.info('🌐 Conectando ao servidor FTP...');
        
        const client = new ftp.Client();
        client.ftp.timeout = 120000; // 2 minutos para arquivos grandes
        
        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP!');
        
        // 2. Navegar para o diretório
        await client.cd(REMOTE_BASE);
        log.success('📂 Navegado para diretório base');
        
        // 3. Criar diretório assets se não existir
        try {
            await client.ensureDir('assets');
            await client.cd('assets');
            log.success('📁 Diretório assets pronto');
        } catch (e) {
            log.warn('Diretório assets já existe');
        }
        
        // 4. Voltar para base
        await client.cd(REMOTE_BASE);
        
        // 5. Upload dos arquivos críticos
        let successCount = 0;
        let errorCount = 0;
        
        for (const file of CRITICAL_FILES) {
            const localPath = path.join(LOCAL_DIST, file);
            const remotePath = file;
            
            if (!fs.existsSync(localPath)) {
                log.warn(`⚠️ Arquivo não encontrado: ${file}`);
                continue;
            }
            
            const fileSize = fs.statSync(localPath).size;
            const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
            
            log.info(`📤 Enviando: ${file} (${fileSizeMB}MB)`);
            
            try {
                await client.uploadFrom(localPath, remotePath);
                log.success(`✅ Enviado: ${file}`);
                successCount++;
            } catch (e) {
                log.error(`❌ Erro ao enviar ${file}: ${e.message}`);
                errorCount++;
            }
        }
        
        // 6. Fechar conexão
        client.close();
        
        console.log('\n📊 RESUMO DO UPLOAD:');
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        
        if (successCount > 0) {
            console.log('\n🎉 ARQUIVOS CRÍTICOS ENVIADOS!');
            console.log('🌐 Site deve funcionar em: https://app.fixfogoes.com.br');
            console.log('⏰ Aguarde alguns minutos para propagação');
        }
        
        return successCount > 0;
        
    } catch (error) {
        log.error('💥 Erro no upload: ' + error.message);
        return false;
    }
}

// Executar upload
if (require.main === module) {
    uploadCriticalFiles().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { uploadCriticalFiles };
