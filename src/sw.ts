// ===================================================================
// 📱 SERVICE WORKER CUSTOMIZADO - FIX FOGÕES (WEB + PWA)
// ===================================================================

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache dos assets gerados pelo Vite
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ===================================================================
// CONFIGURAÇÕES DE CACHE
// ===================================================================

const CACHE_NAME = 'fix-fogoes-v2.1.0';
const STATIC_CACHE_NAME = 'fix-fogoes-static-v2.1.0';
const DYNAMIC_CACHE_NAME = 'fix-fogoes-dynamic-v2.1.0';

// URLs que devem sempre buscar da rede primeiro
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /supabase/,
  /\.json$/
];

// Recursos estáticos para cache agressivo
const STATIC_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|eot)$/
];

// ===================================================================
// ESTRATÉGIAS DE CACHE WORKBOX
// ===================================================================

// API calls - Network First com fallback para cache
registerRoute(
  ({ request, url }) => NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname)),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 horas
      }),
    ],
  })
);

// Imagens e fontes - Cache First
registerRoute(
  ({ request }) => STATIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url)),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
      }),
    ],
  })
);

// Navegação - Stale While Revalidate com fallback offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
      }),
    ],
  })
);

// ===================================================================
// FALLBACK OFFLINE PARA NAVEGAÇÃO
// ===================================================================

// Interceptar navegação quando offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se a navegação falhar e não for uma rota de API, retornar offline.html
        if (!NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(event.request.url))) {
          return caches.match('/offline.html') || new Response('Offline');
        }
        throw new Error('Network failed');
      })
    );
  }
});

// ===================================================================
// PUSH NOTIFICATIONS
// ===================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  let notificationData = {
    title: 'Fix Fogões',
    body: 'Nova atualização disponível',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/icons/icon-96.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/icon-96.png'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('[SW] Erro ao parsear dados do push:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// ===================================================================
// CLIQUE EM NOTIFICAÇÃO
// ===================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
  } else {
    // Clique na notificação (não em ação)
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// ===================================================================
// BACKGROUND SYNC
// ===================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('[SW] Executando sincronização em background...');
    
    // Buscar dados da fila offline (implementação simplificada)
    const offlineQueue = await getOfflineQueue();
    
    for (const item of offlineQueue) {
      try {
        await syncOfflineItem(item);
        await removeFromOfflineQueue(item.id);
        console.log('[SW] Item sincronizado:', item.id);
      } catch (error) {
        console.error('[SW] Erro ao sincronizar item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// ===================================================================
// MENSAGENS DO CLIENTE
// ===================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ===================================================================
// FUNÇÕES AUXILIARES
// ===================================================================

async function getOfflineQueue(): Promise<any[]> {
  // Implementação simplificada - em produção, usar IndexedDB
  return [];
}

async function syncOfflineItem(item: any): Promise<void> {
  // Implementação real faria a sincronização com o servidor
  console.log('[SW] Sincronizando item:', item);
}

async function removeFromOfflineQueue(id: string): Promise<void> {
  // Implementação real removeria do IndexedDB
  console.log('[SW] Removendo da fila:', id);
}

// ===================================================================
// EVENTOS DE CICLO DE VIDA
// ===================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(self.clients.claim());
});

console.log('[SW] Service Worker customizado carregado - Fix Fogões v2.1.0');
