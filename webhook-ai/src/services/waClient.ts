import { EventEmitter } from 'events';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg as any;

export type WAStatus = {
  connected: boolean;
  me?: { id: string; pushname?: string } | null;
  qr?: string | null; // dataURL
};

class WhatsAppClient extends EventEmitter {
  private client: any;
  private status: WAStatus = { connected: false, me: null, qr: null };
  private started = false;
  private messageHandlers: Array<
    (
      from: string,
      body: string,
      meta?: { id?: string; ts?: number; type?: string }
    ) => Promise<void> | void
  > = [];
  private anyMessageHandlers: Array<
    (msg: any, meta?: { id?: string; ts?: number; type?: string }) => Promise<void> | void
  > = [];

  constructor() {
    super();
    this.initClient();
  }

  private overrideWebVersion: string | null = null;
  private reinitTriedWithLatest = false;

  private async fetchLatestWebVersion(): Promise<string | null> {
    try {
      const https = await import('https');
      const url = 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json';
      const data: string = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          const { statusCode } = res;
          if (statusCode && statusCode >= 400) {
            res.resume();
            reject(new Error(`HTTP ${statusCode} ao buscar versions.json`));
            return;
          }
          let body = '';
          res.on('data', (c) => (body += c.toString()));
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      const json = JSON.parse(data);

      const pickFirstString = (...values: any[]) => {
        for (const v of values) {
          if (typeof v === 'string' && v.includes('.')) return v;
        }
        return null;
      };

      // Preferir estável sempre que possível.
      // O arquivo versions.json pode variar de formato; tentamos alguns campos comuns.
      const stable = pickFirstString(
        json?.currentVersion,
        json?.currentStable,
        json?.stable,
        json?.current?.stable,
        json?.current?.version,
        json?.version
      );
      const beta = pickFirstString(
        json?.currentBeta,
        json?.beta,
        json?.current?.beta
      );
      const alpha = pickFirstString(
        json?.currentAlpha,
        json?.alpha,
        json?.current?.alpha
      );
      return stable || beta || alpha;
    } catch (e) {
      console.warn('[WA] fetchLatestWebVersion falhou', (e as any)?.message || e);
      return null;
    }
  }

  private async tryReinitWithLatest(label = 'auth_failure') {
    if (this.reinitTriedWithLatest) return;
    this.reinitTriedWithLatest = true;
    try {
      console.log(`[WA] ${label}: tentando reinit com webVersion mais recente...`);
      const latest = await this.fetchLatestWebVersion();
      if (!latest) { console.warn('[WA] Não conseguiu obter webVersion mais recente'); return; }
      this.overrideWebVersion = latest;
      try { await this.client.destroy(); } catch {}
      this.started = false;
      this.status = { connected: false, me: null, qr: null };
      this.initClient();
      await this.client.initialize();
      this.started = true;
      console.log('[WA] Reinit com webVersion', latest, 'iniciado');
    } catch (e) {
      console.error('[WA] Falha no reinit com latest webVersion', e);
    }
  }


  private initClient() {
    // Detectar ambiente Railway e usar configurações apropriadas
    const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID;

    let execPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;

    // Tentar resolver Chromium dinamicamente (Linux/Nix/Railway)
    if (!execPath && isRailway) {
      try {
        // Para Railway/Nix, buscar diretamente no Nix store primeiro
        console.log('[WA] Railway detected, searching for Chromium in Nix store...');
        const nixPath = execSync(
          'find /nix/store -name chromium -type f -executable 2>/dev/null | head -1',
          { stdio: ['ignore', 'pipe', 'ignore'] }
        )
          .toString()
          .trim();
        if (nixPath) {
          execPath = nixPath;
          console.log('[WA] Found Chromium in Nix store:', execPath);
        } else {
          console.log('[WA] No Chromium found in Nix store, trying alternative paths...');
          // Tentar caminhos alternativos no Railway
          const altPaths = [
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable'
          ];
          for (const altPath of altPaths) {
            try {
              if (fs.existsSync(altPath)) {
                execPath = altPath;
                console.log('[WA] Found Chromium at alternative path:', execPath);
                break;
              }
            } catch {}
          }
        }
      } catch (e) {
        console.log('[WA] Error searching for Chromium in Railway:', e);
      }
    }

    // Para sistemas não-Railway, usar which
    if (!execPath && !isRailway) {
      try {
        const detected = execSync(
          'which chromium || which google-chrome-stable || which google-chrome || which chromium-browser',
          { stdio: ['ignore', 'pipe', 'ignore'] }
        )
          .toString()
          .trim();
        if (detected) {
          execPath = detected;
          console.log('[WA] Found Chromium via which:', execPath);
        }
      } catch {}
    }

    // Verifica se o executável existe e é executável
    if (execPath) {
      try {
        if (!fs.existsSync(execPath)) {
          console.log('[WA] Chromium path does not exist:', execPath);
          execPath = undefined;
        } else {
          console.log('[WA] Using Chromium at:', execPath);
        }
      } catch (e) {
        console.log('[WA] Error checking Chromium path:', e);
        execPath = undefined;
      }
    }

    // Railway: FORÇA uso do Chromium do sistema (EMERGÊNCIA)
    if (isRailway) {
      console.log('[WA] EMERGENCY: Forcing system Chromium on Railway...');
      const emergencyPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];

      for (const path of emergencyPaths) {
        if (fs.existsSync(path)) {
          execPath = path;
          console.log('[WA] EMERGENCY: Found system Chromium at:', execPath);
          break;
        }
      }

      if (!execPath) {
        console.log('[WA] EMERGENCY: No system Chromium found, trying to find any...');
        try {
          const found = execSync('find /usr -name "*chromium*" -type f -executable 2>/dev/null | head -1', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
          if (found && fs.existsSync(found)) {
            execPath = found;
            console.log('[WA] EMERGENCY: Found Chromium via find:', execPath);
          }
        } catch {}
      }
    }

    // Se ainda não encontrou Chromium no Railway, tentar forçar uso do sistema
    if (!execPath && isRailway) {
      try {
        console.log('[WA] Tentando forçar uso do Chromium do sistema...');
        const systemChromium = execSync('which chromium || which chromium-browser || which google-chrome || which google-chrome-stable', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (systemChromium && fs.existsSync(systemChromium)) {
          execPath = systemChromium;
          console.log('[WA] FORÇANDO uso do Chromium do sistema:', systemChromium);
        } else {
          console.log('[WA] No Chromium found, will let Puppeteer auto-detect or fail gracefully');
        }
      } catch (e) {
        console.log('[WA] Erro ao buscar Chromium do sistema, usando auto-detect:', e);
      }
    }

    // Fallback para Windows desktop
    if (!execPath && !isRailway) {
      const candidates = [
        // Google Chrome (64-bit)
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        // Google Chrome (user/local)
        `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
        // Microsoft Edge
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      ].filter(Boolean) as string[];
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            execPath = p;
            break;
          }
        } catch {}
      }
    }

    console.log('[WA] Chromium executable:', execPath || '(auto via PATH)');

    // Railway sempre usa headless
    const headlessEnv = (process.env.WA_HEADLESS || (isRailway ? 'true' : 'false')).toLowerCase();
    const headless = headlessEnv === 'false' ? false : true;

    // Args específicos para Railway
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
      '--lang=pt-BR',
      '--window-size=1280,800',
    ];

    // Args adicionais para Railway
    const railwayArgs = [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
    ];

    const args = isRailway ? [...baseArgs, ...railwayArgs] : baseArgs;
    // Forçar um dataPath estável para o cache de sessão (evita reconnect infinito)
    // Railway: se houver Volume montado em /data, esse default permite persistir auth entre deploys.
    const defaultData = isRailway
      ? '/data/wwebjs_auth/fixbot-v2'
      : path.join(os.homedir(), '.wwebjs_auth', 'fixbot-v2');
    const chromeUserData = path.join(os.homedir(), '.wwebjs_chrome');
    const dataPath = process.env.WA_DATA_PATH || defaultData;
    try {
      fs.mkdirSync(dataPath, { recursive: true });
    } catch {}
    try {
      fs.mkdirSync(chromeUserData, { recursive: true });
    } catch {}

    const chosenWebVersion = this.overrideWebVersion || process.env.WA_WEB_VERSION || null;
    const baseConfig: any = {
      authStrategy: new LocalAuth({ clientId: 'fixbot-v2', dataPath }),
      puppeteer: {
        headless,
        args,
        ...(execPath ? { executablePath: execPath } : {}),
        ignoreHTTPSErrors: true,
        devtools: false,
      },
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      qrMaxRetries: 10,
      restartOnAuthFail: true,
    };
    if (chosenWebVersion) {
      const remotePath = `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${chosenWebVersion}.html`;
      baseConfig.webVersion = chosenWebVersion;
      baseConfig.webVersionCache = { type: 'remote', remotePath };
      console.log('[WA] usando webVersion pinada:', chosenWebVersion);
    } else {
      console.log('[WA] webVersion automática (não pinada)');
    }

    this.client = new Client(baseConfig as any);



    // Se escanear QR mas n e3o autenticar em ~30s, tenta latest
    let qrScanTimer: NodeJS.Timeout | null = null;
    this.client.on('qr', () => {
      if (qrScanTimer) clearTimeout(qrScanTimer);
      qrScanTimer = setTimeout(() => {
        if (!this.status.connected) {
          this.tryReinitWithLatest('qr_timeout');
        }
      }, 30000);
    });

    // Reanexa listeners se já existiam (após reconexões)
    if ((this as any)._boundMessageListener) {
      this.client.on('message', (this as any)._boundMessageListener);
    }
    this.client.on('auth_failure', (msg: any) => {
      console.log('[WA] 🔍 DEBUG auth_failure:', msg);
      this.tryReinitWithLatest('auth_failure');
    });

    this.client.on('disconnected', (reason: any) => {
      console.log('[WA] 🔍 DEBUG disconnected:', reason);
      // Em alguns casos de desconexão durante pareamento, tentar latest ajuda
      const text = String(reason || '').toLowerCase();
      if (!this.status.connected && (text.includes('nav') || text.includes('pair') || text.includes('connect'))) {
        this.tryReinitWithLatest('disconnected');
      }
    });

    if ((this as any)._boundAnyMessageListener) {
      this.client.on('message', (this as any)._boundAnyMessageListener);
    }

    this.client.on('qr', async (qr: string) => {
      console.log('[WA] 🎯 QR EVENT TRIGGERED! QR length:', qr?.length || 0);
      try {
        const dataURL = await qrcode.toDataURL(qr);
        this.status.qr = dataURL;
        this.status.connected = false;
        this.status.me = null;
        console.log('[WA] ✅ QR recebido e convertido para DataURL');
        this.emit('qr', dataURL);
      } catch (e) {
        console.error('[WA] ❌ Erro ao converter QR para DataURL:', e);
      }
    });

    // Debug: Capturar TODAS as mensagens que chegam
    this.client.on('message_create', (msg: any) => {
      console.log('[WA] 🔍 DEBUG message_create:', {
        from: msg.from,
        to: msg.to,
        body: msg.body?.slice(0, 100),
        type: msg.type,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
      });
    });

    this.client.on('message', (msg: any) => {
      console.log('[WA] 🔍 DEBUG message event:', {
        from: msg.from,
        to: msg.to,
        body: msg.body?.slice(0, 100),
        type: msg.type,
        fromMe: msg.fromMe,
        timestamp: msg.timestamp,
      });
    });

    // Debug: Outros eventos importantes
    this.client.on('authenticated', () => {
      console.log('[WA] 🔍 DEBUG authenticated event');
    });

    this.client.on('auth_failure', (msg: any) => {
      console.log('[WA] 🔍 DEBUG auth_failure:', msg);
    });

    this.client.on('disconnected', (reason: any) => {
      console.log('[WA] 🔍 DEBUG disconnected:', reason);
    });

    this.client.on('ready', async () => {
      this.status.connected = true;
      this.status.qr = null;

      try {
        // Tentar obter informações do usuário de várias formas
        const info = (this.client as any).info || {};
        let meId = null;
        let pushname = null;

        // Método 1: Usar getState() se disponível
        try {
          const state = await this.client.getState();
          console.log('[WA] State:', state);
        } catch (e: any) {
          console.log('[WA] Não foi possível obter state:', e?.message || String(e));
        }

        // Método 2: Usar info.wid
        if (info?.wid) {
          meId = info.wid._serialized || info.wid.user || info.wid;
          pushname = info.pushname;
        }

        // Método 3: Tentar obter via getContacts() e encontrar o próprio número
        if (!meId) {
          try {
            const contacts = await this.client.getContacts();
            const me = contacts.find((c: any) => c.isMe);
            if (me) {
              meId = me.id._serialized || me.id.user || me.number;
              pushname = me.pushname || me.name;
            }
          } catch (e: any) {
            console.log('[WA] Não foi possível obter contatos:', e?.message || String(e));
          }
        }

        // Método 4: Usar client.pupPage para executar JavaScript no WhatsApp Web
        if (!meId) {
          try {
            const page = this.client.pupPage;
            if (page) {
              const result = await page.evaluate(() => {
                try {
                  // Tentar várias formas de acessar as informações do WhatsApp Web

                  // Método 1: Store.Conn
                  // @ts-ignore
                  // @ts-ignore
                  if (
                    (window as any).Store &&
                    (window as any).Store.Conn &&
                    (window as any).Store.Conn.wid
                  ) {
                    return {
                      id:
                        (window as any).Store.Conn.wid._serialized ||
                        (window as any).Store.Conn.wid.user,
                      pushname: (window as any).Store.Conn.pushname,
                    };
                  }

                  // Método 2: WAWebMain
                  // @ts-ignore
                  const WAWebMain = window.require && window.require('WAWebMain');
                  if (WAWebMain && WAWebMain.Conn && WAWebMain.Conn.wid) {
                    return {
                      id: WAWebMain.Conn.wid._serialized || WAWebMain.Conn.wid.user,
                      pushname: WAWebMain.Conn.pushname,
                    };
                  }

                  // Método 3: Procurar no DOM
                  const headerElement =
                    document.querySelector('[data-testid="default-user"]') ||
                    document.querySelector('[title*="+"]') ||
                    document.querySelector('header [title]');
                  const he = headerElement as HTMLElement | null;
                  if (he && (he as any).title) {
                    const title = (he as any).title as string;
                    const phoneMatch = title.match(/\+?(\d{10,15})/);
                    if (phoneMatch) {
                      return {
                        id: phoneMatch[1] + '@c.us',
                        pushname: title.replace(/\+?\d{10,15}/, '').trim(),
                      };
                    }
                  }

                  // Método 4: Procurar elementos com números de telefone
                  const phoneElements = document.querySelectorAll(
                    '[title*="+"], [aria-label*="+"]'
                  );
                  for (const el of Array.from(phoneElements)) {
                    const he2 = el as HTMLElement;
                    const text = (he2 as any).title || he2.getAttribute('aria-label') || '';
                    const phoneMatch = text.match(/\+?(\d{10,15})/);
                    if (phoneMatch) {
                      return {
                        id: phoneMatch[1] + '@c.us',
                        pushname: text.replace(/\+?\d{10,15}/, '').trim() || 'Bot',
                      };
                    }
                  }

                  return null;
                } catch (error) {
                  console.error('Erro ao executar JavaScript:', error);
                  return null;
                }
              });
              if (result) {
                meId = result.id;
                pushname = result.pushname;
              }
            }
          } catch (e: any) {
            console.log(
              '[WA] Não foi possível executar JavaScript na página:',
              e?.message || String(e)
            );
          }
        }

        // Se não conseguiu obter o ID, usar o número conhecido do negócio
        if (!meId) {
          meId = '5548988332664@c.us'; // Número do Fix Fogões
          pushname = 'Fix Fogões';
          console.log('[WA] Usando número configurado do negócio:', meId);
        }

        this.status.me = { id: String(meId), pushname: pushname || 'Fix Fogões' };
        console.log('[WA] Ready', this.status.me);

        // Marcar momento do ready para evitar responder mensagens antigas no primeiro polling
        this.lastMessageCheck = Date.now();
        // Iniciar polling de mensagens como backup
        this.startMessagePolling();

        this.emit('ready', this.status);
      } catch (error) {
        console.error('[WA] Erro ao obter informações do usuário:', error);
        this.status.me = { id: 'unknown', pushname: 'Bot' };
        console.log('[WA] Ready (fallback)', this.status.me);
        this.emit('ready', this.status);
      }
    });

    this.client.on('authenticated', () => {
      this.status.qr = null;
      console.log('[WA] Autenticado');
      this.emit('authenticated');

      // WORKAROUND: Forçar ready após 3 segundos se não disparar naturalmente
      setTimeout(async () => {
        if (!this.status.connected) {
          console.log('[WA] WORKAROUND: Forçando status ready após timeout');
          this.status.connected = true;
          this.status.qr = null;

          try {
            // Usar os mesmos métodos do evento ready
            const info = (this.client as any).info || {};
            let meId = null;
            let pushname = null;

            // Método 1: Usar info.wid
            if (info?.wid) {
              meId = info.wid._serialized || info.wid.user || info.wid;
              pushname = info.pushname;
            }

            // Método 2: Tentar obter via getContacts()
            if (!meId) {
              try {
                const contacts = await this.client.getContacts();
                const me = contacts.find((c: any) => c.isMe);
                if (me) {
                  meId = me.id._serialized || me.id.user || me.number;
                  pushname = me.pushname || me.name;
                }
              } catch (e: any) {
                console.log(
                  '[WA] WORKAROUND: Não foi possível obter contatos:',
                  e?.message || String(e)
                );
              }
            }

            // Método 3: JavaScript na página
            if (!meId) {
              try {
                const page = this.client.pupPage;
                if (page) {
                  const result = await page.evaluate(() => {
                    try {
                      // Tentar várias formas de acessar as informações do WhatsApp Web

                      // Método 1: Store.Conn
                      // @ts-ignore
                      // @ts-ignore
                      if (
                        (window as any).Store &&
                        (window as any).Store.Conn &&
                        (window as any).Store.Conn.wid
                      ) {
                        return {
                          id:
                            (window as any).Store.Conn.wid._serialized ||
                            (window as any).Store.Conn.wid.user,
                          pushname: (window as any).Store.Conn.pushname,
                        };
                      }

                      // Método 2: WAWebMain
                      // @ts-ignore
                      const WAWebMain = window.require && window.require('WAWebMain');
                      if (WAWebMain && WAWebMain.Conn && WAWebMain.Conn.wid) {
                        return {
                          id: WAWebMain.Conn.wid._serialized || WAWebMain.Conn.wid.user,
                          pushname: WAWebMain.Conn.pushname,
                        };
                      }

                      // Método 3: Procurar no DOM
                      const headerElement =
                        document.querySelector('[data-testid="default-user"]') ||
                        document.querySelector('[title*="+"]') ||
                        document.querySelector('header [title]');
                      const he = headerElement as HTMLElement | null;
                      if (he && (he as any).title) {
                        const title = (he as any).title as string;
                        const phoneMatch = title.match(/\+?(\d{10,15})/);
                        if (phoneMatch) {
                          return {
                            id: phoneMatch[1] + '@c.us',
                            pushname: title.replace(/\+?\d{10,15}/, '').trim(),
                          };
                        }
                      }

                      // Método 4: Procurar elementos com números de telefone
                      const phoneElements = document.querySelectorAll(
                        '[title*="+"], [aria-label*="+"]'
                      );
                      for (const el of Array.from(phoneElements)) {
                        const he2 = el as HTMLElement;
                        const text = (he2 as any).title || he2.getAttribute('aria-label') || '';
                        const phoneMatch = text.match(/\+?(\d{10,15})/);
                        if (phoneMatch) {
                          return {
                            id: phoneMatch[1] + '@c.us',
                            pushname: text.replace(/\+?\d{10,15}/, '').trim() || 'Bot',
                          };
                        }
                      }

                      return null;
                    } catch (error) {
                      console.error('WORKAROUND: Erro ao executar JavaScript:', error);
                      return null;
                    }
                  });
                  if (result) {
                    meId = result.id;
                    pushname = result.pushname;
                  }
                }
              } catch (e: any) {
                console.log(
                  '[WA] WORKAROUND: Não foi possível executar JavaScript:',
                  e?.message || String(e)
                );
              }
            }

            // Se não conseguiu obter o ID, usar o número conhecido do negócio
            if (!meId) {
              meId = '5548988332664@c.us'; // Número do Fix Fogões
              pushname = 'Fix Fogões';
              console.log('[WA] WORKAROUND: Usando número configurado do negócio:', meId);
            }

            this.status.me = { id: String(meId), pushname: pushname || 'Fix Fogões' };
            console.log('[WA] Ready (forçado)', this.status.me);

            // Marcar momento do ready para evitar responder mensagens antigas no primeiro polling
            this.lastMessageCheck = Date.now();
            // Iniciar polling de mensagens como backup
            this.startMessagePolling();

            this.emit('ready', this.status);
          } catch (error) {
            console.error('[WA] WORKAROUND: Erro:', error);
            this.status.me = { id: 'unknown', pushname: 'Bot' };
            console.log('[WA] Ready (forçado fallback)', this.status.me);
            this.emit('ready', this.status);
          }
        }
      }, 3000);
    });

    this.client.on('loading_screen', (percent: number, msg: string) => {
      console.log('[WA] loading', percent, msg);
    });

    this.client.on('auth_failure', (m: any) => {
      console.error('[WA] Falha de autenticação', m);
    });

    this.client.on('disconnected', async (r: any) => {
      this.status.connected = false;
      this.status.qr = null;
      console.warn('[WA] Desconectado', r);
      this.emit('disconnected');
      // Se foi LOGOUT, não tentar reconectar automaticamente (arquivos podem estar lockados no Windows)
      if (String(r).toUpperCase() === 'LOGOUT') {
        this.started = false;
        return;
      }
      // auto-retry leve para manter QR disponível em dev
      try {
        await new Promise((res) => setTimeout(res, 2000));
        if (this.started) {
          console.log('[WA] Tentando reconectar...');
          this.initClient();
          await this.client.initialize();
        }
      } catch (e) {
        console.error('[WA] Falha ao reconectar', e);
      }
    });
  }

  public async start() {
    if (this.started) return;
    console.log('[WA] 🚀 Iniciando WhatsApp client...');
    this.started = true;
    console.log('[WA] 🔧 Chamando client.initialize()...');
    await this.client.initialize();
    console.log('[WA] ✅ Client.initialize() concluído');
  }

  public async connect(force = false) {
    // Idempotente: só reinicia se for explicitamente solicitado
    if (!force) {
      if (this.status.connected) {
        // Já conectado; nada a fazer
        return;
      }
      if (this.started) {
        // Já inicializado (aguardando QR ou autenticando); não derruba
        return;
      }
      // Não iniciado: inicializa para gerar QR
      this.initClient();
      await this.start();
      return;
    }
    // Força reinicialização (ex.: recuperação de erro)
    try {
      await this.client.destroy();
    } catch {}
    this.started = false;
    this.status = { connected: false, me: null, qr: null };
    this.initClient();
    await this.start();
  }

  public getStatus(): WAStatus {
    return { ...this.status };
  }

  // Handler simplificado (texto)
  public onMessage(
    handler: (
      from: string,
      body: string,
      meta?: { id?: string; ts?: number; type?: string }
    ) => Promise<void> | void
  ) {
    this.messageHandlers.push(handler);
    console.log(
      '[WA] 🔧 Registrando handler de mensagem. Total handlers:',
      this.messageHandlers.length
    );

    // Garante apenas um listener real no client
    if (!(this as any)._boundMessageListener) {
      console.log('[WA] 🔧 Criando listener de mensagem no client');
      (this as any)._boundMessageListener = async (msg: any) => {
        try {
          const preview = msg?.body ? String(msg.body).slice(0, 80) : `[${msg.type || 'unknown'}]`;
          console.log('[WA] 📨 MENSAGEM RECEBIDA de', msg.from, 'texto:', preview);
          console.log('[WA] 📨 Detalhes da mensagem:', {
            from: msg.from,
            to: msg.to,
            body: msg.body,
            type: msg.type,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            id: msg?.id?._serialized || msg?.id?.id,
          });

          const meta = {
            id: msg?.id?._serialized || msg?.id?.id,
            ts: msg?.timestamp,
            type: msg?.type,
          };
          console.log('[WA] 📨 Processando com', this.messageHandlers.length, 'handlers');

          for (const h of this.messageHandlers) {
            try {
              console.log('[WA] 📨 Executando handler...');
              await h(msg.from, msg.body || '', meta);
            } catch (e) {
              console.error('[WA] onMessage handler error', e);
            }
          }
        } catch (e) {
          console.error('[WA] onMessage dispatch error', e);
        }
      };

      // Registrar o listener no client
      this.client.on('message', (this as any)._boundMessageListener);
      console.log('[WA] 🔧 Listener de mensagem registrado no client');
    }
  }

  // Handler raw para acessar mídias/imagens
  public onAnyMessage(
    handler: (msg: any, meta?: { id?: string; ts?: number; type?: string }) => Promise<void> | void
  ) {
    this.anyMessageHandlers.push(handler);
    if (!(this as any)._boundAnyMessageListener) {
      (this as any)._boundAnyMessageListener = async (msg: any) => {
        try {
          const meta = {
            id: msg?.id?._serialized || msg?.id?.id,
            ts: msg?.timestamp,
            type: msg?.type,
          };
          for (const h of this.anyMessageHandlers) {
            try {
              await h(msg, meta);
            } catch (e) {
              console.error('[WA] onAnyMessage handler error', e);
            }
          }
        } catch (e) {
          console.error('[WA] onAnyMessage dispatch error', e);
        }
      };
      this.client.on('message', (this as any)._boundAnyMessageListener);
    }
  }

  public async sendButtons(to: string, text: string, buttons: Array<{ id: string; text: string }>) {
    // whatsapp-web.js mudou a API - usando fallback direto para texto simples
    try {
      // Tentativa com nova API se disponível
      const { Buttons } = await import('whatsapp-web.js');
      if (Buttons && typeof Buttons === 'function') {
        const btns = buttons.map((b) => ({ id: b.id, body: b.text }));
        const msg = new Buttons(text, btns);
        return (this.client as any).sendMessage(to, msg);
      }
    } catch (e) {
      console.warn('[WA] sendButtons falhou, usando fallback para texto simples', e);
    }

    // Fallback: texto simples com numeração
    const fallback = text + '\n\n' + buttons.map((b, i) => `${i + 1}) ${b.text}`).join('\n');
    return (this.client as any).sendMessage(to, fallback);
  }

  public async sendList(
    to: string,
    text: string,
    options: Array<{ id: string; text: string }>,
    title = 'Opções',
    sectionTitle = 'Escolha:'
  ) {
    try {
      const List = (await import('whatsapp-web.js')).List as any;
      const rows = options.map((o) => ({ id: o.id, title: o.text }));
      const sections = [{ title: sectionTitle, rows }];
      const list = new List(text, 'Selecionar', sections, title);
      return (this.client as any).sendMessage(to, list);
    } catch (e) {
      console.warn('[WA] sendList falhou, fallback para texto simples', e);
      const fallback = text + '\n' + options.map((o, i) => `${i + 1}) ${o.text}`).join('\n');
      return (this.client as any).sendMessage(to, fallback);
    }
  }

  public async sendText(to: string, text: string) {
    try {
      return await this.client.sendMessage(to, text);
    } catch (e: any) {
      const message = String(e?.message || e);

      const isWaRuntimeMismatch =
        message.includes('markedUnread') ||
        message.includes('getChat') ||
        message.includes('Evaluation failed') ||
        message.includes('Cannot read properties of undefined');

      // Em produção (Railway), já vimos falha de compatibilidade do WA Web:
      // "Cannot read properties of undefined (reading 'markedUnread')".
      // Nesses casos, forçar restart com webVersion atualizada e repetir 1x.
      if (isWaRuntimeMismatch) {
        console.warn(
          '[WA] sendText falhou (runtime WA). Forçando restart com webVersion mais recente e retry 1x...',
          { to, err: message.slice(0, 200) }
        );
        const latest = await this.fetchLatestWebVersion();
        if (latest) {
          this.overrideWebVersion = latest;
        }
        await this.connect(true);
        await new Promise((res) => setTimeout(res, 5000));
        return await this.client.sendMessage(to, text);
      }

      throw e;
    }
  }

  public async reset() {
    try {
      await this.client.destroy();
    } catch {}
    this.status = { connected: false, me: null, qr: null };
    this.started = false;
    this.initClient();
    await this.client.initialize();
    this.started = true;
  }

  public async destroy() {
    try {
      await this.client.destroy();
    } catch {}
    this.status = { connected: false, me: null, qr: null };
    this.started = false;
  }

  public async logout() {
    try {
      // Sair da sessão e fechar o cliente
      if ((this.client as any)?.logout) {
        await this.client.logout();
      }
      await this.client.destroy();
    } catch (e) {
      console.warn('[WA] logout destroy warn', e);
      // Windows: força limpeza manual se EBUSY
      if (String(e).includes('EBUSY') || String(e).includes('resource busy')) {
        console.log('[WA] Tentando limpeza manual da sessão...');
        try {
          const fs = await import('fs');
          const path = await import('path');
          const authDir = path.join(process.cwd(), '.wwebjs_auth');
          if (fs.existsSync(authDir)) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // aguarda 2s
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('[WA] Sessão limpa manualmente');
          }
        } catch (cleanupError) {
          console.warn('[WA] Falha na limpeza manual', cleanupError);
        }
      }
    }
    this.status = { connected: false, me: null, qr: null };
    this.started = false;
    // não reinicia automaticamente; ficará desconectado até connect()
  }

  private lastMessageCheck = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  private startMessagePolling() {
    if (this.pollingInterval) return; // Já está rodando

    console.log('[WA] 🔄 Iniciando polling de mensagens como backup...');

    this.pollingInterval = setInterval(async () => {
      try {
        if (!this.status.connected) return;

        // Tentar obter mensagens recentes via JavaScript no navegador
        const page = this.client.pupPage;
        if (!page) return;

        const messages = await page.evaluate(() => {
          try {
            // @ts-ignore
            const Store = window.Store || window.require('WAWebMain');
            if (!Store || !Store.Chat) return [];

            const chats = Store.Chat.models || [];
            const recentMessages = [];
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000;

            for (const chat of chats.slice(0, 10)) {
              // Verificar apenas os 10 chats mais recentes
              if (!chat.msgs || !chat.msgs.models) continue;

              for (const msg of chat.msgs.models.slice(-5)) {
                // Últimas 5 mensagens de cada chat
                if (!msg || msg.fromMe) continue; // Ignorar mensagens próprias

                const timestamp = msg.t * 1000; // Converter para milliseconds
                if (
                  timestamp > fiveMinutesAgo &&
                  timestamp > ((window as any).lastPollingCheck || 0)
                ) {
                  recentMessages.push({
                    id: msg.id._serialized || msg.id.id,
                    from: msg.from._serialized || msg.from,
                    body: msg.body || '',
                    timestamp: timestamp,
                    type: msg.type || 'chat',
                  });
                }
              }
            }

            (window as any).lastPollingCheck = now;
            return recentMessages;
          } catch (error) {
            console.error('Erro no polling de mensagens:', error);
            return [];
          }
        });

        // Processar mensagens encontradas
        for (const msg of messages) {
          if (msg.timestamp > this.lastMessageCheck) {
            console.log('[WA] 🔄 POLLING: Mensagem encontrada!', {
              from: msg.from,
              body: msg.body?.slice(0, 50),
              timestamp: new Date(msg.timestamp).toISOString(),
            });

            // Disparar handlers manualmente
            const meta = { id: msg.id, ts: msg.timestamp, type: msg.type };
            for (const h of this.messageHandlers) {
              try {
                await h(msg.from, msg.body || '', meta);
              } catch (e) {
                console.error('[WA] Polling handler error', e);
              }
            }
          }
        }

        this.lastMessageCheck = Date.now();
      } catch (error) {
        console.error('[WA] Erro no polling:', error);
      }
    }, 10000); // Verificar a cada 10 segundos
  }

  private stopMessagePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[WA] 🔄 Polling de mensagens parado');
    }
  }
}

export const waClient = new WhatsAppClient();
