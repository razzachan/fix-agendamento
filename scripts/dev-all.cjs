#!/usr/bin/env node
/**
 * 🚀 DEV-ALL - Script completo para iniciar todos os serviços Fix Fogões
 *
 * SERVIÇOS E PORTAS:
 * - Frontend (Vite): 8082
 * - API Backend: 3001
 * - Webhook AI: 3100
 * - Middleware Python: 8000
 * - Thermal Print Service: 3002
 *
 * USO:
 *   npm run dev:all
 *   node scripts/dev-all.cjs
 */

const { spawn, execSync } = require('child_process');
const os = require('os');
const path = require('path');

// Configuração dos serviços
const SERVICES = {
  'API': {
    command: 'npm',
    args: ['run', 'dev:api'],
    cwd: process.cwd(),
    port: 3001,
    color: '\x1b[32m', // Verde
    description: 'Backend API (Express + Supabase)'
  },
  'WEB': {
    command: 'npm',
    // Força Vite a servir na rede (LAN) e na porta certa
    args: ['run', 'dev:frontend', '--', '--host', '0.0.0.0', '--port', '8082'],
    cwd: process.cwd(),
    port: 8082,
    color: '\x1b[36m', // Ciano
    description: 'Frontend (Vite + React)'
  },
  'WA': {
    command: 'npm',
    // Habilita modo watch para reiniciar automaticamente o Webhook-AI ao editar arquivos
    args: ['run', 'dev', '--', '--watch'],
    cwd: path.join(process.cwd(), 'webhook-ai'),
    port: 3100,
    color: '\x1b[35m', // Magenta
    description: 'WhatsApp AI Bot (watch)'
  },
  'PY': {
    command: 'python',
    args: ['middleware.py'],
    cwd: process.cwd(),
    port: 8000,
    color: '\x1b[33m', // Amarelo
    description: 'Middleware Python (FastAPI)'
  },
  'THERMAL': {
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'thermal-print-service'),
    port: 3002,
    color: '\x1b[34m', // Azul
    description: 'Thermal Print Service'
  }
};

const PORTS_TO_KILL = [8082, 3000, 3001, 3100, 8000, 3002];
const RESET = '\x1b[0m';

let SHUTTING_DOWN = false;

function log(service, message, isError = false) {
  const color = SERVICES[service]?.color || '\x1b[37m';
  const prefix = isError ? '❌' : '📡';
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${service}] ${prefix} ${timestamp} - ${message}${RESET}`);
}

function logSystem(message) {
  console.log(`\x1b[1m🚀 [SYSTEM] ${message}${RESET}`);
}

// Função para matar processos nas portas
function killPorts() {
  logSystem('Matando processos nas portas...');

  try {
    execSync(`node scripts/kill-ports.cjs ${PORTS_TO_KILL.join(' ')}`, {
      stdio: 'inherit',
      timeout: 10000
    });
  } catch (error) {
    console.warn('⚠️  Aviso: Erro ao matar portas (pode ser normal se nenhum processo estava rodando)');
  }
}

// Função para verificar dependências
function checkDependencies() {
  logSystem('Verificando dependências...');

  const checks = [
    { cmd: 'node --version', name: 'Node.js' },
    { cmd: 'npm --version', name: 'NPM' },
    { cmd: 'python --version', name: 'Python' }
  ];

  for (const check of checks) {
    try {
      const version = execSync(check.cmd, { encoding: 'utf8' }).trim();
      console.log(`✅ ${check.name}: ${version}`);
    } catch (error) {
      console.error(`❌ ${check.name}: Não encontrado`);
      if (check.name === 'Python') {
        console.log('💡 Tente: py --version (Windows) ou python3 --version');
      }
    }
  }
}

// Função para instalar dependências se necessário
function setupDependencies() {
  logSystem('Verificando se dependências estão instaladas...');

  const nodeModulesExists = require('fs').existsSync('node_modules');
  const webhookNodeModulesExists = require('fs').existsSync('webhook-ai/node_modules');
  const thermalNodeModulesExists = require('fs').existsSync('thermal-print-service/node_modules');

  if (!nodeModulesExists || !webhookNodeModulesExists || !thermalNodeModulesExists) {
    logSystem('Instalando dependências...');
    try {
      execSync('npm run dev:setup', { stdio: 'inherit', timeout: 120000 });
    } catch (error) {
      console.error('❌ Erro ao instalar dependências:', error.message);
      process.exit(1);
    }
  }
}

// Evita spawn duplicado checando porta antes de subir
function isPortFree(port) {
  try {
    const net = require('net');
    return new Promise((resolve) => {
      const srv = net.createServer().once('error', () => resolve(false)).once('listening', () => {
        srv.close(() => resolve(true));
      }).listen(port, '127.0.0.1');
    });
  } catch {
    return Promise.resolve(true);
  }
}

// Função para iniciar um serviço
function startService(serviceName) {
  const service = SERVICES[serviceName];
  if (!service) {
    console.error(`❌ Serviço desconhecido: ${serviceName}`);
    return null;
  }

  log(serviceName, `Iniciando ${service.description} na porta ${service.port}...`);

  const envOverrides = {};
  // Garantir que o Webhook AI aponte para o middleware local na porta 8000
  if (serviceName === 'WA') {
    envOverrides.MIDDLEWARE_URL = 'http://127.0.0.1:8000';
    // Garantir bind na rede para acesso pelo celular (QR/proxy)
    envOverrides.PORT = String(service.port);
    envOverrides.HOST = '0.0.0.0';
  }
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: os.platform() === 'win32',
    env: { ...process.env, ...envOverrides }
  });

  // Capturar stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => log(serviceName, line));
  });

  // Capturar stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => log(serviceName, line, true));
  });

  // Tratar saída do processo
  child.on('close', (code) => {
    if (code !== 0) {
      log(serviceName, `Processo encerrado com código ${code}`, true);
    } else {
      log(serviceName, 'Processo encerrado normalmente');
    }
  });

  child.on('error', (error) => {
    log(serviceName, `Erro ao iniciar: ${error.message}`, true);
  });

  return child;
}

// Função principal
function main() {
  // Detectar IP de rede (LAN)
  const ifaces = os.networkInterfaces();
  let lanIp = null;
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) { lanIp = ni.address; break; }
    }
    if (lanIp) break;
  }

  console.log(`
🚀 ===============================================
   FIX FOGÕES - DESENVOLVIMENTO COMPLETO
===============================================

📋 SERVIÇOS QUE SERÃO INICIADOS:
${Object.entries(SERVICES).map(([name, service]) =>
  `   ${service.color}${name}${RESET}: ${service.description} (porta ${service.port})`
).join('\n')}

🌐 URLS DE ACESSO (LOCAL):
   Frontend:  http://localhost:8082
   API:       http://localhost:3001
   WhatsApp:  http://localhost:3100
   Middleware:http://localhost:8000
   Thermal:   http://localhost:3002
${lanIp ? `
🌐 URLS DE ACESSO (REDE):
   Frontend:  http://${lanIp}:8082
   API:       http://${lanIp}:3001
   WhatsApp:  http://${lanIp}:3100
   Middleware:http://${lanIp}:8000
   Thermal:   http://${lanIp}:3002
` : ''}
===============================================
`);

  // 1. Verificar dependências
  checkDependencies();

  // 2. Matar processos nas portas
  killPorts();

  // 3. Instalar dependências se necessário
  setupDependencies();

  // 4. Aguardar um pouco
  logSystem('Aguardando 2 segundos...');
  setTimeout(async () => {
    // 5. Iniciar todos os serviços
    logSystem('Iniciando todos os serviços...');

    const processes = {};
    for (const serviceName of Object.keys(SERVICES)) {
      const { port } = SERVICES[serviceName];
      const free = await isPortFree(port);
      if (!free) {
        log(serviceName, `Porta ${port} já em uso. Não iniciando outra instância.`, true);
        continue;
      }
      processes[serviceName] = startService(serviceName);


    }

    // 6. Tratar sinais de interrupção
    process.on('SIGINT', () => {
      logSystem('Recebido SIGINT, encerrando todos os serviços...');
      SHUTTING_DOWN = true;
      Object.entries(processes).forEach(([name, proc]) => {
        if (proc && !proc.killed) {
          log(name, 'Encerrando...');
          proc.kill('SIGTERM');
        }
      });

      setTimeout(() => {
        logSystem('Forçando encerramento...');
        process.exit(0);
      }, 5000);
    });

    process.on('SIGTERM', () => {
      logSystem('Recebido SIGTERM, encerrando...');
      SHUTTING_DOWN = true;
      process.exit(0);
    });

    logSystem('Todos os serviços iniciados! Pressione Ctrl+C para parar.');

	    // 7. Health-checks de rede aps subir (logs amigveis)
	    try {

	    // Respawn automático do WhatsApp Bot se o processo sair (ex.: /restart)
	    function attachRespawn(serviceName) {
	      if (serviceName !== 'WA') return;
	      if (!processes[serviceName]) return;
	      const delayMs = 1200;
	      processes[serviceName].on('close', async (code) => {
	        if (SHUTTING_DOWN) return; // não respawn durante shutdown
	        log(serviceName, `Processo saiu (código ${code}). Respawn em ${delayMs}ms...`);
	        setTimeout(async () => {
	          try {
	            const free = await isPortFree(SERVICES[serviceName].port);
	            if (!free) {
	              log(serviceName, `Porta ${SERVICES[serviceName].port} ocupada, abortando respawn.`, true);
	              return;
	            }
	            processes[serviceName] = startService(serviceName);
	            // reanexar para próximos exits
	            attachRespawn(serviceName);
	          } catch (e) {
	            log(serviceName, `Falha ao respawn: ${e.message || e}`, true);
	          }
	        }, delayMs);
	      });
	    }
	    // Habilita respawn para WA (apenas uma vez, fora do laço)
	    attachRespawn('WA');

	      const http = require('http');
	      const check = (url) => new Promise((resolve) => {
	        const t0 = Date.now();
	        const req = http.get(url, { timeout: 3000 }, (res) => {
	          res.resume();
	          const dt = Date.now() - t0;
	          logSystem(`HEALTH ${url} -> ${res.statusCode} (${dt}ms)`);
	          resolve();
	        });
	        req.on('error', (e) => { logSystem(`HEALTH ${url} -> ERROR ${e.code || e.message}`); resolve(); });
	        req.on('timeout', () => { req.destroy(); logSystem(`HEALTH ${url} -> TIMEOUT`); resolve(); });
	      });
	      setTimeout(async () => {
	        const urls = [
	          'http://localhost:3100/health',
	          'http://localhost:8000/docs',
	          'http://localhost:3001/health',
	          'http://localhost:8082',
	        ];
	        if (lanIp) {
	          urls.push(`http://${lanIp}:3100/health`);
	          urls.push(`http://${lanIp}:3100/`);
	          urls.push(`http://${lanIp}:3001/health`);
	          urls.push(`http://${lanIp}:8082/`);
	          urls.push(`http://${lanIp}:8000/docs`);
	        }
	        for (const u of urls) { await check(u); }
	      }, 4000);
	    } catch {}


  }, 2000);
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, SERVICES, PORTS_TO_KILL };
