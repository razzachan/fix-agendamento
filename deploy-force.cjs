/**
 * =====================================================
 * DEPLOY FORÇADO - HOSTGATOR
 * =====================================================
 * Script para forçar atualização dos arquivos
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

// Logger
const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[✅] ${msg}`),
    error: (msg) => console.log(`[❌] ${msg}`)
};

async function deployForce() {
    try {
        console.log('🚀 DEPLOY FORÇADO - ATUALIZANDO ARQUIVOS CRÍTICOS\n');
        
        // 1. Conectar ao FTP
        log.info('🌐 Conectando ao servidor FTP...');
        
        const client = new ftp.Client();
        client.ftp.timeout = 120000;
        client.ftp.verbose = true;
        
        await client.access(FTP_CONFIG);
        log.success('✅ Conectado ao FTP!');
        
        // 2. Navegar para o diretório
        log.info(`📂 Navegando para: ${REMOTE_BASE}`);
        await client.cd(REMOTE_BASE);
        log.success('📂 Navegado para diretório base');
        
        // 3. FORÇAR ATUALIZAÇÃO DO INDEX.HTML
        log.info('🔄 FORÇANDO atualização do index.html...');
        await client.uploadFrom('./dist/index.html', 'index.html');
        log.success('✅ index.html FORÇADO!');
        
        // 4. FORÇAR ATUALIZAÇÃO DOS ASSETS PRINCIPAIS
        log.info('🔄 FORÇANDO atualização dos assets...');
        
        // Listar arquivos na pasta assets local
        const assetsPath = './dist/assets';
        if (fs.existsSync(assetsPath)) {
            const files = fs.readdirSync(assetsPath);
            
            // Atualizar apenas os arquivos JavaScript principais
            for (const file of files) {
                if (file.includes('index-') && file.endsWith('.js')) {
                    log.info(`📄 FORÇANDO: ${file}`);
                    await client.uploadFrom(`${assetsPath}/${file}`, `assets/${file}`);
                    log.success(`✅ FORÇADO: ${file}`);
                    break; // Apenas o principal
                }
            }
        }
        
        // 5. CRIAR ARQUIVO DE TESTE COM TIMESTAMP ATUAL
        const testContent = `DEPLOY FORÇADO - ${new Date().toISOString()}\nTeste de atualização forçada\nTimestamp: ${Date.now()}`;
        fs.writeFileSync('./test-force-deploy.txt', testContent);
        
        log.info('📄 FORÇANDO arquivo de teste...');
        await client.uploadFrom('./test-force-deploy.txt', 'test-force-deploy.txt');
        log.success('✅ Arquivo de teste FORÇADO!');
        
        client.close();
        
        console.log('\n🎉 DEPLOY FORÇADO CONCLUÍDO!');
        console.log('🌐 Verifique: https://app.fixfogoes.com.br');
        console.log('📄 Teste: https://app.fixfogoes.com.br/test-force-deploy.txt');
        console.log('⏰ Aguarde 2-3 minutos para propagação');
        
    } catch (error) {
        log.error(`Erro no deploy forçado: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

deployForce();
