#!/usr/bin/env node

/**
 * =====================================================
 * SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA DO DEPLOY
 * =====================================================
 * Execute: node setup-deploy.js
 * Configura tudo automaticamente para deploy
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para perguntar ao usuário
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// Função para log colorido
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`)
};

async function setupDeploy() {
    console.log('\n🚀 CONFIGURAÇÃO AUTOMÁTICA DO DEPLOY\n');
    
    try {
        // 1. Coletar informações do usuário
        log.info('Vamos configurar o deploy automático para HostGator...\n');
        
        const ftpServer = await question('🌐 Servidor FTP (ex: ftp.seudominio.com): ') || 'ftp.fixfogoes.com.br';
        const ftpUser = await question('👤 Usuário FTP (ex: usuario@dominio.com): ') || 'miragioc@fixfogoes.com.br';
        const ftpPassword = await question('🔑 Senha FTP: ');
        const cpanelUser = await question('📁 Usuário cPanel (ex: miragioc): ') || 'miragioc';
        const domain = await question('🌍 Domínio/subdomínio (ex: app.fixfogoes.com.br): ') || 'app.fixfogoes.com.br';
        
        // 2. Atualizar arquivo .env
        log.info('\n📝 Atualizando arquivo .env...');
        
        let envContent = '';
        if (fs.existsSync('.env')) {
            envContent = fs.readFileSync('.env', 'utf8');
        }
        
        // Remover configurações FTP antigas se existirem
        envContent = envContent.replace(/# Configurações de Deploy FTP HostGator[\s\S]*?(?=\n#|\n[A-Z]|$)/g, '');
        
        // Adicionar novas configurações
        const ftpConfig = `
# Configurações de Deploy FTP HostGator
FTP_SERVER=${ftpServer}
FTP_USERNAME=${ftpUser}
FTP_PASSWORD=${ftpPassword}
CPANEL_USER=${cpanelUser}
DEPLOY_DOMAIN=${domain}
`;
        
        envContent += ftpConfig;
        fs.writeFileSync('.env', envContent);
        log.success('✅ Arquivo .env atualizado!');
        
        // 3. Atualizar script de deploy
        log.info('🔧 Atualizando script de deploy...');
        
        let deployScript = fs.readFileSync('deploy-hostgator.sh', 'utf8');
        deployScript = deployScript.replace(/CPANEL_USER=".*?"/, `CPANEL_USER="${cpanelUser}"`);
        deployScript = deployScript.replace(/DOMAIN=".*?"/, `DOMAIN="${domain}"`);
        
        fs.writeFileSync('deploy-hostgator.sh', deployScript);
        log.success('✅ Script de deploy atualizado!');
        
        // 4. Criar arquivo de configuração do Cron Job
        log.info('⏰ Criando configuração do Cron Job...');
        
        const cronConfig = `# =====================================================
# CONFIGURAÇÃO DO CRON JOB PARA DEPLOY AUTOMÁTICO
# =====================================================
# 
# INSTRUÇÕES PARA CONFIGURAR NO CPANEL:
# 
# 1. Acesse o cPanel da HostGator
# 2. Procure por "Trabalho Cron" ou "Cron Jobs"
# 3. Clique em "Adicionar novo trabalho cron"
# 4. Configure conforme abaixo:
# 
# FREQUÊNCIA RECOMENDADA:
# - Minuto: */15 (a cada 15 minutos)
# - Hora: * (todas as horas)
# - Dia: * (todos os dias)
# - Mês: * (todos os meses)
# - Dia da semana: * (todos os dias da semana)
# 
# COMANDO PARA COLAR NO CPANEL:
cd /home/${cpanelUser}/public_html/${domain} && bash deploy-hostgator.sh

# ALTERNATIVA (se o comando acima não funcionar):
/bin/bash /home/${cpanelUser}/public_html/${domain}/deploy-hostgator.sh

# PARA LOGS DETALHADOS:
cd /home/${cpanelUser}/public_html/${domain} && bash deploy-hostgator.sh >> /home/${cpanelUser}/logs/cron.log 2>&1

# =====================================================
# CONFIGURAÇÃO COMPLETA!
# =====================================================
# 
# Após configurar o Cron Job:
# 1. Faça um commit e push no GitHub
# 2. Aguarde até 15 minutos para o deploy automático
# 3. Acesse: https://${domain}
# 
# Para deploy manual imediato:
# npm run deploy:hostgator
# 
# =====================================================
`;
        
        fs.writeFileSync('CRON-CONFIG.txt', cronConfig);
        log.success('✅ Configuração do Cron Job criada!');
        
        // 5. Testar configurações
        log.info('🧪 Testando configurações...');
        
        // Verificar se basic-ftp está instalado
        try {
            require('basic-ftp');
            log.success('✅ Dependência basic-ftp encontrada!');
        } catch (e) {
            log.warn('⚠️  Instalando basic-ftp...');
            const { execSync } = require('child_process');
            execSync('npm install basic-ftp --save-dev', { stdio: 'inherit' });
            log.success('✅ basic-ftp instalado!');
        }
        
        // 6. Criar script de teste
        log.info('🔍 Criando script de teste...');
        
        const testScript = `#!/usr/bin/env node

const { deploy } = require('./deploy-manual.js');

console.log('🧪 TESTANDO CONFIGURAÇÕES DE DEPLOY...');

deploy().then(() => {
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
});
`;
        
        fs.writeFileSync('test-deploy.js', testScript);
        fs.chmodSync('test-deploy.js', '755');
        log.success('✅ Script de teste criado!');
        
        // 7. Resumo final
        console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!\n');
        
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. 📁 Configure o Cron Job no cPanel usando: CRON-CONFIG.txt');
        console.log('2. 🧪 Teste o deploy: npm run deploy:hostgator');
        console.log('3. 🚀 Faça commit e push para ativar deploy automático');
        console.log('4. 🌐 Acesse: https://' + domain);
        
        console.log('\n📄 ARQUIVOS CRIADOS/ATUALIZADOS:');
        console.log('- ✅ .env (credenciais FTP)');
        console.log('- ✅ deploy-hostgator.sh (script automático)');
        console.log('- ✅ CRON-CONFIG.txt (instruções cPanel)');
        console.log('- ✅ test-deploy.js (script de teste)');
        
        console.log('\n🛠️  COMANDOS DISPONÍVEIS:');
        console.log('- npm run deploy:hostgator (deploy manual)');
        console.log('- node test-deploy.js (testar configurações)');
        
        rl.close();
        
    } catch (error) {
        log.error('💥 Erro na configuração:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Executar configuração
setupDeploy();
