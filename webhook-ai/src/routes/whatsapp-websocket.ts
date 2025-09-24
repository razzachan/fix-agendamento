import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { waClient } from '../services/waClient';

export function setupWhatsAppWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/whatsapp-qr'
  });

  console.log('[WS] WhatsApp WebSocket server iniciado em /whatsapp-qr');

  wss.on('connection', (ws, req) => {
    console.log('[WS] Nova conexão WebSocket:', req.socket.remoteAddress);

    // Enviar status atual quando cliente conecta
    const sendStatus = () => {
      const status = waClient.getStatus();
      ws.send(JSON.stringify({
        type: 'status',
        ...status
      }));
    };

    // Enviar status inicial
    sendStatus();

    // Listeners para eventos do WhatsApp
    const onQR = (qr: string) => {
      console.log('[WS] Enviando QR code para cliente');
      ws.send(JSON.stringify({
        type: 'qr',
        qr: qr
      }));
    };

    const onReady = () => {
      console.log('[WS] WhatsApp pronto, notificando cliente');
      ws.send(JSON.stringify({
        type: 'ready',
        connected: true
      }));
    };

    const onDisconnected = () => {
      console.log('[WS] WhatsApp desconectado, notificando cliente');
      ws.send(JSON.stringify({
        type: 'disconnected',
        connected: false
      }));
    };

    const onAuthFailure = (msg: string) => {
      console.log('[WS] Falha na autenticação, notificando cliente');
      ws.send(JSON.stringify({
        type: 'auth_failure',
        message: msg
      }));
    };

    // Registrar listeners
    waClient.on('qr', onQR);
    waClient.on('ready', onReady);
    waClient.on('disconnected', onDisconnected);
    waClient.on('auth_failure', onAuthFailure);

    // Lidar com mensagens do cliente
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WS] Mensagem recebida:', message);

        switch (message.action) {
          case 'initialize':
            console.log('[WS] Inicializando WhatsApp...');
            try {
              await waClient.start();
            } catch (error) {
              console.error('[WS] Erro ao inicializar:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Erro ao inicializar WhatsApp'
              }));
            }
            break;

          case 'disconnect':
            console.log('[WS] Desconectando WhatsApp...');
            try {
              await waClient.destroy();
            } catch (error) {
              console.error('[WS] Erro ao desconectar:', error);
            }
            break;

          case 'status':
            sendStatus();
            break;

          default:
            console.log('[WS] Ação desconhecida:', message.action);
        }
      } catch (error) {
        console.error('[WS] Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Erro ao processar mensagem'
        }));
      }
    });

    // Cleanup quando cliente desconecta
    ws.on('close', () => {
      console.log('[WS] Cliente desconectado');
      
      // Remover listeners
      waClient.off('qr', onQR);
      waClient.off('ready', onReady);
      waClient.off('disconnected', onDisconnected);
      waClient.off('auth_failure', onAuthFailure);
    });

    ws.on('error', (error) => {
      console.error('[WS] Erro WebSocket:', error);
    });

    // Ping/pong para manter conexão viva
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  return wss;
}
