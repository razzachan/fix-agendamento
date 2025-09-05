/**
 * Gerenciador do Service Worker para forçar atualizações
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  
  private constructor() {
    this.init();
  }
  
  public static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }
  
  private init() {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
    
    // Escutar mensagens do Service Worker
    this.listenForMessages();
  }
  
  private async registerServiceWorker() {
    try {
      console.log('🔧 [SW Manager] Registrando Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('✅ [SW Manager] Service Worker registrado:', registration);
      
      // Verificar se há atualização disponível
      registration.addEventListener('updatefound', () => {
        console.log('🔄 [SW Manager] Atualização encontrada!');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🚀 [SW Manager] Nova versão instalada, forçando reload...');
              window.location.reload();
            }
          });
        }
      });
      
    } catch (error) {
      console.error('❌ [SW Manager] Erro ao registrar Service Worker:', error);
    }
  }
  
  private listenForMessages() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 [SW Manager] Mensagem recebida:', event.data);

        // REMOVIDO auto-reload para evitar loop infinito
        // O reload agora só acontece manualmente via botão de debug
      });
    }
  }
  
  public async forceUpdate() {
    try {
      console.log('🔄 [SW Manager] Forçando atualização...');
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          await registration.update();
          console.log('✅ [SW Manager] Atualização forçada');
        }
      }
    } catch (error) {
      console.error('❌ [SW Manager] Erro ao forçar atualização:', error);
    }
  }
  
  public async clearAllCaches() {
    try {
      console.log('🧹 [SW Manager] Limpando todos os caches...');
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ [SW Manager] Removendo cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        console.log('✅ [SW Manager] Todos os caches limpos');
      }
    } catch (error) {
      console.error('❌ [SW Manager] Erro ao limpar caches:', error);
    }
  }
  
  public async fullReset() {
    try {
      console.log('🔄 [SW Manager] Reset completo...');
      
      // 1. Limpar todos os caches
      await this.clearAllCaches();
      
      // 2. Desregistrar Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        await Promise.all(
          registrations.map(registration => {
            console.log('🗑️ [SW Manager] Desregistrando SW:', registration);
            return registration.unregister();
          })
        );
      }
      
      // 3. Limpar localStorage
      localStorage.clear();
      
      // 4. Limpar sessionStorage
      sessionStorage.clear();
      
      console.log('✅ [SW Manager] Reset completo finalizado');
      
      // 5. Recarregar página
      window.location.reload();
      
    } catch (error) {
      console.error('❌ [SW Manager] Erro no reset completo:', error);
    }
  }
}

// 🚨 SERVICE WORKER DESABILITADO TEMPORARIAMENTE PARA DEBUG
console.log('🚫 [SW Manager] Service Worker DESABILITADO para debug de cache');

// Inicializar automaticamente - COMENTADO
// ServiceWorkerManager.getInstance();

// Exportar para uso global - COMENTADO
// (window as any).swManager = ServiceWorkerManager.getInstance();
