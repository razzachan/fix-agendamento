/**
 * =====================================================
 * DEPLOY TESTE SIMPLES - HOSTGATOR
 * =====================================================
 * Script para testar se o deploy está funcionando
 * =====================================================
 */

const ftp = require('basic-ftp');
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

// Logger simples
const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[✅] ${msg}`),
    error: (msg) => console.log(`[❌] ${msg}`)
};

async function deployTest() {
    try {
        console.log('🚀 TESTE DE DEPLOY SIMPLES\n');
        
        // 1. Conectar ao FTP
        log.info('🌐 Conectando ao servidor FTP...');
        
        const client = new ftp.Client();
        client.ftp.timeout = 120000;
        client.ftp.verbose = true;
        
        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP!');
        
        // 2. Navegar para o diretório
        log.info(`📂 Navegando para: ${REMOTE_BASE}`);
        await client.ensureDir(REMOTE_BASE);
        await client.cd(REMOTE_BASE);
        log.success('📂 Navegado para diretório base');
        
        // 3. Enviar apenas o index.html
        log.info('📄 Enviando index.html...');
        await client.uploadFrom('./dist/index.html', 'index.html');
        log.success('✅ index.html enviado!');
        
        // 4. Enviar arquivo de teste
        log.info('📄 Enviando arquivo de teste...');
        await client.uploadFrom('./test-deploy-timestamp.txt', 'test-deploy-timestamp.txt');
        log.success('✅ Arquivo de teste enviado!');
        
        client.close();
        
        console.log('\n🎉 TESTE DE DEPLOY CONCLUÍDO!');
        console.log('🌐 Verifique: https://app.fixfogoes.com.br');
        console.log('📄 Teste: https://app.fixfogoes.com.br/test-deploy-timestamp.txt');
        
    } catch (error) {
        log.error(`Erro no deploy: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

deployTest();
