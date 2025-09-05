#!/usr/bin/env node
/**
 * 🏥 HEALTH CHECK ALL - Verifica se todos os serviços estão funcionando
 * 
 * USO:
 *   npm run health:all
 *   node scripts/health-check-all.cjs
 */

const http = require('http');
const https = require('https');

// Configuração dos serviços para verificação
const HEALTH_CHECKS = {
  'Frontend': {
    url: 'http://localhost:8082',
    port: 8082,
    expectedStatus: [200, 304],
    timeout: 5000,
    description: 'Vite Dev Server'
  },
  'API': {
    url: 'http://localhost:3001/health',
    port: 3001,
    expectedStatus: [200],
    timeout: 5000,
    description: 'Express API'
  },
  'WhatsApp AI': {
    url: 'http://localhost:3100/health',
    port: 3100,
    expectedStatus: [200],
    timeout: 5000,
    description: 'WhatsApp Bot'
  },
  'Middleware': {
    url: 'http://localhost:8000/docs',
    port: 8000,
    expectedStatus: [200],
    timeout: 5000,
    description: 'FastAPI Middleware'
  },
  'Thermal Print': {
    url: 'http://localhost:3002/api/status',
    port: 3002,
    expectedStatus: [200],
    timeout: 5000,
    description: 'Thermal Print Service'
  }
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.slice(0, 500) // Limitar dados para não poluir logs
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(timeout);
  });
}

async function checkService(name, config) {
  const startTime = Date.now();
  
  try {
    log(`🔍 Verificando ${name} (${config.url})...`, 'cyan');
    
    const response = await makeRequest(config.url, config.timeout);
    const duration = Date.now() - startTime;
    
    if (config.expectedStatus.includes(response.status)) {
      log(`✅ ${name}: OK (${response.status}) - ${duration}ms`, 'green');
      return { name, status: 'OK', code: response.status, duration, error: null };
    } else {
      log(`⚠️  ${name}: Status inesperado (${response.status}) - ${duration}ms`, 'yellow');
      return { name, status: 'WARNING', code: response.status, duration, error: `Status ${response.status}` };
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ ${name}: FALHOU - ${error.message} (${duration}ms)`, 'red');
    return { name, status: 'ERROR', code: null, duration, error: error.message };
  }
}

async function checkAllServices() {
  log('\n🏥 ===============================================', 'bright');
  log('   FIX FOGÕES - VERIFICAÇÃO DE SAÚDE', 'bright');
  log('===============================================\n', 'bright');
  
  const results = [];
  
  // Verificar todos os serviços em paralelo
  const promises = Object.entries(HEALTH_CHECKS).map(([name, config]) => 
    checkService(name, config)
  );
  
  const serviceResults = await Promise.all(promises);
  results.push(...serviceResults);
  
  // Resumo
  log('\n📊 ===============================================', 'bright');
  log('   RESUMO DA VERIFICAÇÃO', 'bright');
  log('===============================================', 'bright');
  
  const okServices = results.filter(r => r.status === 'OK');
  const warningServices = results.filter(r => r.status === 'WARNING');
  const errorServices = results.filter(r => r.status === 'ERROR');
  
  log(`✅ Funcionando: ${okServices.length}`, 'green');
  log(`⚠️  Com avisos: ${warningServices.length}`, 'yellow');
  log(`❌ Com erro: ${errorServices.length}`, 'red');
  
  // Detalhes dos serviços
  log('\n📋 DETALHES:', 'bright');
  results.forEach(result => {
    const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    const color = result.status === 'OK' ? 'green' : result.status === 'WARNING' ? 'yellow' : 'red';
    
    let details = `${icon} ${result.name}: ${result.status}`;
    if (result.code) details += ` (${result.code})`;
    details += ` - ${result.duration}ms`;
    if (result.error) details += ` - ${result.error}`;
    
    log(`   ${details}`, color);
  });
  
  // URLs de acesso
  log('\n🌐 URLS DE ACESSO:', 'bright');
  Object.entries(HEALTH_CHECKS).forEach(([name, config]) => {
    const result = results.find(r => r.name === name);
    const icon = result?.status === 'OK' ? '🟢' : result?.status === 'WARNING' ? '🟡' : '🔴';
    log(`   ${icon} ${name}: ${config.url.replace('/health', '').replace('/docs', '').replace('/api/status', '')}`, 'cyan');
  });
  
  // Comandos úteis
  log('\n🛠️  COMANDOS ÚTEIS:', 'bright');
  log('   Iniciar todos: npm run dev:all', 'cyan');
  log('   Matar portas: npm run dev:kill-ports', 'cyan');
  log('   Setup deps: npm run dev:setup', 'cyan');
  
  // Status final
  const allOk = errorServices.length === 0;
  const hasWarnings = warningServices.length > 0;
  
  if (allOk && !hasWarnings) {
    log('\n🎉 TODOS OS SERVIÇOS ESTÃO FUNCIONANDO PERFEITAMENTE!', 'green');
    process.exit(0);
  } else if (allOk && hasWarnings) {
    log('\n⚠️  SERVIÇOS FUNCIONANDO COM ALGUNS AVISOS', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ ALGUNS SERVIÇOS ESTÃO COM PROBLEMAS', 'red');
    log('\n💡 SUGESTÕES:', 'yellow');
    log('   1. Verifique se todos os serviços foram iniciados: npm run dev:all', 'yellow');
    log('   2. Aguarde alguns segundos para os serviços iniciarem completamente', 'yellow');
    log('   3. Verifique se as portas não estão sendo usadas por outros processos', 'yellow');
    log('   4. Verifique as variáveis de ambiente (.env)', 'yellow');
    process.exit(1);
  }
}

// Função para verificar portas ocupadas
function checkPorts() {
  const { execSync } = require('child_process');
  const os = require('os');
  
  log('\n🔍 Verificando portas ocupadas...', 'cyan');
  
  const ports = [8082, 3001, 3100, 8000, 3002];
  const isWindows = os.platform() === 'win32';
  
  ports.forEach(port => {
    try {
      let command;
      if (isWindows) {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -i :${port}`;
      }
      
      const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim()) {
        log(`   🟡 Porta ${port}: EM USO`, 'yellow');
      } else {
        log(`   🔴 Porta ${port}: LIVRE`, 'red');
      }
    } catch (error) {
      log(`   🔴 Porta ${port}: LIVRE`, 'red');
    }
  });
}

// Executar verificação
async function main() {
  try {
    // Verificar portas primeiro
    checkPorts();
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar serviços
    await checkAllServices();
    
  } catch (error) {
    log(`\n❌ Erro durante verificação: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { checkAllServices, checkService, HEALTH_CHECKS };
