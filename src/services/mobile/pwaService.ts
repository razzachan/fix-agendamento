// ===================================================================
// 📱 SERVIÇO PWA E FUNCIONALIDADES MOBILE (MVP 4)
// ===================================================================

import {
  PWAConfig,
  PushNotification,
  PushSubscription,
  OfflineData,
  OfflineQueue,
  NetworkStatus,
  MobileViewport,
  CameraConfig,
  LocationData,
  MobileAppConfig
} from '@/types/mobile';

/**
 * Serviço principal para funcionalidades PWA e mobile
 */
export class PWAService {
  private static isInitialized = false;
  private static offlineQueue: OfflineQueue = {
    items: [],
    is_syncing: false,
    last_sync: '',
    sync_errors: []
  };

  /**
   * Inicializar PWA
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔄 [PWAService] Inicializando PWA...');

      if (this.isInitialized) {
        console.log('✅ [PWAService] PWA já inicializado');
        return;
      }

      // Registrar Service Worker
      await this.registerServiceWorker();

      // Configurar notificações push
      await this.setupPushNotifications();

      // Configurar modo offline
      this.setupOfflineMode();

      // Configurar listeners de rede
      this.setupNetworkListeners();

      // Configurar listeners de instalação
      this.setupInstallListeners();

      this.isInitialized = true;
      console.log('✅ [PWAService] PWA inicializado com sucesso');

    } catch (error) {
      console.error('❌ [PWAService] Erro ao inicializar PWA:', error);
      throw error;
    }
  }

  /**
   * Verificar se o app pode ser instalado
   */
  static canInstall(): boolean {
    return 'beforeinstallprompt' in window;
  }

  /**
   * Solicitar instalação do PWA
   */
  static async requestInstall(): Promise<boolean> {
    try {
      // @ts-ignore - beforeinstallprompt não está tipado
      const deferredPrompt = window.deferredPrompt;
      
      if (!deferredPrompt) {
        console.log('⚠️ [PWAService] Prompt de instalação não disponível');
        return false;
      }

      // Mostrar prompt de instalação
      deferredPrompt.prompt();

      // Aguardar resposta do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`📱 [PWAService] Resultado da instalação: ${outcome}`);
      return outcome === 'accepted';

    } catch (error) {
      console.error('❌ [PWAService] Erro ao solicitar instalação:', error);
      return false;
    }
  }

  /**
   * Verificar se está rodando como PWA
   */
  static isRunningAsPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           // @ts-ignore
           window.navigator.standalone === true;
  }

  /**
   * Solicitar permissão para notificações
   */
  static async requestNotificationPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.log('⚠️ [PWAService] Notificações não suportadas');
        return false;
      }

      const permission = await Notification.requestPermission();
      console.log(`🔔 [PWAService] Permissão de notificação: ${permission}`);
      
      return permission === 'granted';

    } catch (error) {
      console.error('❌ [PWAService] Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  }

  /**
   * Enviar notificação local
   */
  static async sendLocalNotification(notification: Omit<PushNotification, 'id' | 'timestamp'>): Promise<void> {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('⚠️ [PWAService] Notificações não permitidas');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192.png',
        badge: notification.badge || '/icons/badge-72.png',
        image: notification.image,
        tag: notification.tag,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: true,
        silent: false
      });

      console.log('✅ [PWAService] Notificação enviada');

    } catch (error) {
      console.error('❌ [PWAService] Erro ao enviar notificação:', error);
    }
  }

  /**
   * Obter status da rede
   */
  static getNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      connection_type: connection?.type || 'unknown',
      effective_type: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100,
      save_data: connection?.saveData || false
    };
  }

  /**
   * Obter informações do viewport mobile
   */
  static getMobileViewport(): MobileViewport {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      is_portrait: height > width,
      is_mobile: width <= 768,
      is_tablet: width > 768 && width <= 1024,
      device_pixel_ratio: window.devicePixelRatio || 1,
      safe_area: this.getSafeArea()
    };
  }

  /**
   * Adicionar item à fila offline
   */
  static addToOfflineQueue(item: Omit<OfflineData, 'timestamp' | 'sync_status' | 'retry_count'>): void {
    const offlineItem: OfflineData = {
      ...item,
      timestamp: Date.now(),
      sync_status: 'pending',
      retry_count: 0
    };

    this.offlineQueue.items.push(offlineItem);
    this.saveOfflineQueue();
    
    console.log('📦 [PWAService] Item adicionado à fila offline:', offlineItem.type);
  }

  /**
   * Sincronizar fila offline
   */
  static async syncOfflineQueue(): Promise<void> {
    try {
      if (this.offlineQueue.is_syncing || !navigator.onLine) {
        return;
      }

      console.log('🔄 [PWAService] Sincronizando fila offline...');
      this.offlineQueue.is_syncing = true;

      const pendingItems = this.offlineQueue.items.filter(item => item.sync_status === 'pending');
      
      for (const item of pendingItems) {
        try {
          item.sync_status = 'syncing';
          
          // Processar item baseado no tipo
          await this.processOfflineItem(item);
          
          item.sync_status = 'synced';
          console.log(`✅ [PWAService] Item sincronizado: ${item.type}#${item.id}`);
          
        } catch (error) {
          item.sync_status = 'failed';
          item.retry_count++;
          item.error_message = error instanceof Error ? error.message : 'Erro desconhecido';
          
          this.offlineQueue.sync_errors.push({
            item_id: item.id,
            error: item.error_message,
            timestamp: Date.now(),
            retry_count: item.retry_count
          });
          
          console.error(`❌ [PWAService] Erro ao sincronizar item ${item.type}#${item.id}:`, error);
        }
      }

      // Remover itens sincronizados
      this.offlineQueue.items = this.offlineQueue.items.filter(item => item.sync_status !== 'synced');
      
      this.offlineQueue.is_syncing = false;
      this.offlineQueue.last_sync = new Date().toISOString();
      this.saveOfflineQueue();

      console.log('✅ [PWAService] Sincronização offline concluída');

    } catch (error) {
      this.offlineQueue.is_syncing = false;
      console.error('❌ [PWAService] Erro na sincronização offline:', error);
    }
  }

  /**
   * Capturar foto usando câmera
   */
  static async capturePhoto(config: Partial<CameraConfig> = {}): Promise<File | null> {
    try {
      const defaultConfig: CameraConfig = {
        enabled: true,
        facing_mode: 'environment',
        resolution: { width: 1920, height: 1080 },
        quality: 0.8,
        format: 'jpeg'
      };

      const finalConfig = { ...defaultConfig, ...config };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: finalConfig.facing_mode,
          width: finalConfig.resolution.width,
          height: finalConfig.resolution.height
        }
      });

      // Criar elemento de vídeo temporário
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Aguardar vídeo carregar
      await new Promise(resolve => video.onloadedmetadata = resolve);

      // Criar canvas para captura
      const canvas = document.createElement('canvas');
      canvas.width = finalConfig.resolution.width;
      canvas.height = finalConfig.resolution.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível obter contexto do canvas');

      // Capturar frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Parar stream
      stream.getTracks().forEach(track => track.stop());

      // Converter para blob
      return new Promise(resolve => {
        canvas.toBlob(resolve, `image/${finalConfig.format}`, finalConfig.quality);
      });

    } catch (error) {
      console.error('❌ [PWAService] Erro ao capturar foto:', error);
      return null;
    }
  }

  /**
   * Obter localização atual
   */
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      if (!('geolocation' in navigator)) {
        console.log('⚠️ [PWAService] Geolocalização não suportada');
        return null;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        altitude_accuracy: position.coords.altitudeAccuracy || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        timestamp: position.timestamp
      };

    } catch (error) {
      console.error('❌ [PWAService] Erro ao obter localização:', error);
      return null;
    }
  }

  // ===================================================================
  // MÉTODOS PRIVADOS
  // ===================================================================

  private static async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ [PWAService] Service Worker não suportado');
      return;
    }

    // Evitar registros manuais duplicados
    // - Em produção, o vite-plugin-pwa injeta o registerSW automaticamente
    // - Em desenvolvimento, mantemos SW desativado para não causar problemas de cache
    try {
      if (import.meta.env.PROD) {
        console.log('ℹ️ [PWAService] Registro do SW gerenciado pelo VitePWA (autoUpdate).');
        return;
      } else {
        console.log('ℹ️ [PWAService] SW desativado no modo desenvolvimento para evitar cache.');
        return;
      }
    } catch (error) {
      console.error('❌ [PWAService] Erro ao gerenciar registro do Service Worker:', error);
    }
  }

  private static async setupPushNotifications(): Promise<void> {
    if (!('PushManager' in window)) {
      console.log('⚠️ [PWAService] Push notifications não suportadas');
      return;
    }

    // Configuração será implementada quando houver backend para push
    console.log('📱 [PWAService] Push notifications configuradas');
  }

  private static setupOfflineMode(): void {
    // Carregar fila offline do localStorage
    this.loadOfflineQueue();

    // Configurar sincronização automática quando voltar online
    window.addEventListener('online', () => {
      console.log('🌐 [PWAService] Conexão restaurada, sincronizando...');
      this.syncOfflineQueue();
    });
  }

  private static setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 [PWAService] Online');
      this.dispatchNetworkEvent('online');
    });

    window.addEventListener('offline', () => {
      console.log('📴 [PWAService] Offline');
      this.dispatchNetworkEvent('offline');
    });
  }

  private static setupInstallListeners(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // @ts-ignore
      window.deferredPrompt = e;
      console.log('📱 [PWAService] Prompt de instalação disponível');
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ [PWAService] App instalado com sucesso');
    });
  }

  private static getSafeArea() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
    };
  }

  private static saveOfflineQueue(): void {
    try {
      localStorage.setItem('pwa_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('❌ [PWAService] Erro ao salvar fila offline:', error);
    }
  }

  private static loadOfflineQueue(): void {
    try {
      const saved = localStorage.getItem('pwa_offline_queue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('❌ [PWAService] Erro ao carregar fila offline:', error);
    }
  }

  private static async processOfflineItem(item: OfflineData): Promise<void> {
    // Implementar processamento específico por tipo
    switch (item.type) {
      case 'service_order':
        // Processar ordem de serviço
        break;
      case 'client':
        // Processar cliente
        break;
      case 'stock_movement':
        // Processar movimentação de estoque
        break;
      default:
        throw new Error(`Tipo de item não suportado: ${item.type}`);
    }
  }

  private static dispatchNetworkEvent(type: 'online' | 'offline'): void {
    const event = new CustomEvent('networkchange', {
      detail: { type, status: this.getNetworkStatus() }
    });
    window.dispatchEvent(event);
  }
}
