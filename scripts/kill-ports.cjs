#!/usr/bin/env node
/*
 Cross-platform killer for ports. Usage:
   node scripts/kill-ports.cjs 8082 3000 3100
 If no ports are provided, defaults to [8082, 3000, 3100].
*/
const { execSync } = require('child_process');
const os = require('os');

function log(msg){ console.log(`[kill-ports] ${msg}`); }

function unique(arr){ return Array.from(new Set(arr.filter(Boolean))); }

function pidsOnPortWin(port){
  try{
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { stdio: ['pipe','pipe','ignore'] }).toString();
    const pids = [];
    out.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if(!line) return;
      const parts = line.split(/\s+/);
      const pid = parts[parts.length - 1];
      if(pid && /^\d+$/.test(pid)) pids.push(pid);
    });
    return unique(pids);
  } catch {
    return [];
  }
}

function pidsOnPortUnix(port){
  try{
    const out = execSync(`bash -lc "(lsof -i :${port} -t || true)"`, { stdio: ['pipe','pipe','ignore'] }).toString();
    return unique(out.split(/\s+/).filter(s=>/^\d+$/.test(s)));
  } catch {
    return [];
  }
}

function killPidWin(pid){
  try{ execSync(`taskkill /PID ${pid} /F`, { stdio: ['ignore','ignore','ignore'] }); log(`killed PID ${pid}`);} catch(e){ log(`warn: could not kill PID ${pid}: ${e.message}`);} }
function killPidUnix(pid){
  try{ execSync(`kill -9 ${pid}`, { stdio: ['ignore','ignore','ignore'] }); log(`killed PID ${pid}`);} catch(e){ log(`warn: could not kill PID ${pid}: ${e.message}`);} }

const ports = process.argv.slice(2).map(n=>parseInt(n,10)).filter(Boolean);
const targetPorts = ports.length ? ports : [8082, 3000, 3100];
const isWin = process.platform === 'win32';

log(`Scanning ports: ${targetPorts.join(', ')}`);

for(const port of targetPorts){
  const pids = isWin ? pidsOnPortWin(port) : pidsOnPortUnix(port);
  if(!pids.length){ log(`port ${port}: no processes`); continue; }
  log(`port ${port}: PIDs ${pids.join(', ')}`);
  for(const pid of pids){
    if(isWin) killPidWin(pid); else killPidUnix(pid);
  }
}

log('Done.');

