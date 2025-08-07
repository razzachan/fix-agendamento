// ===================================================================
// 📱 SERVICE WORKER PARA PWA - FIX FOGÕES (MVP 4)
// ===================================================================

const CACHE_NAME = 'fix-fogoes-v2.0.0';
const STATIC_CACHE_NAME = 'fix-fogoes-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'fix-fogoes-dynamic-v2.0.0';

// Recursos para cache estático (sempre em cache)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/twa-manifest.json',
  '/assetlinks.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-72.png',
  '/icons/icon-152.png'
];

// Recursos para cache dinâmico (cache conforme uso)
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/
];

// URLs que devem sempre buscar da rede
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /supabase/
];

/**
 * Evento de instalação do Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache estático criado');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Recursos estáticos em cache');
        return self.skipWaiting(); // Ativar imediatamente
      })
      .catch((error) => {
        console.error('[SW] Erro ao instalar:', error);
      })
  );
});

/**
 * Evento de ativação do Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remover caches antigos
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('fix-fogoes-')) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker ativado');
        return self.clients.claim(); // Controlar todas as abas
      })
      .catch((error) => {
        console.error('[SW] Erro ao ativar:', error);
      })
  );
});

/**
 * Evento de interceptação de requisições
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia baseada no tipo de recurso
  if (isNetworkFirst(request.url)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Verificar se deve usar estratégia Network First
 */
function isNetworkFirst(url) {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Verificar se é um recurso estático
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.endsWith(asset)) ||
         DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Estratégia Cache First (para recursos estáticos)
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Adicionar ao cache se for bem-sucedido
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First falhou:', error);
    
    // Retornar página offline para navegação
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Offline');
    }
    
    throw error;
  }
}

/**
 * Estratégia Network First (para APIs)
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear apenas respostas bem-sucedidas de GET
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network falhou, tentando cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Estratégia Stale While Revalidate (para conteúdo dinâmico)
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Network falhou:', error);
    return cachedResponse;
  });
  
  // Retornar cache imediatamente se disponível, senão aguardar rede
  return cachedResponse || fetchPromise;
}

/**
 * Evento de sincronização em background
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Executar sincronização em background
 */
async function doBackgroundSync() {
  try {
    // Buscar dados da fila offline no IndexedDB
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

/**
 * Evento de notificação push
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event);
  
  const options = {
    body: 'Nova atualização disponível',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Fix Fogões', options)
  );
});

/**
 * Evento de clique em notificação
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
  } else {
    // Clique na notificação (não em ação)
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Funções auxiliares para IndexedDB (simuladas)
 */
async function getOfflineQueue() {
  // Implementação real usaria IndexedDB
  return [];
}

async function syncOfflineItem(item) {
  // Implementação real faria a sincronização
  console.log('Sincronizando item:', item);
}

async function removeFromOfflineQueue(id) {
  // Implementação real removeria do IndexedDB
  console.log('Removendo da fila:', id);
}

/**
 * Evento de erro
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Erro:', event.error);
});

/**
 * Evento de erro não tratado
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Promise rejeitada:', event.reason);
});

console.log('[SW] Service Worker carregado');
