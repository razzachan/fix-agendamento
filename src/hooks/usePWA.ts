// ===================================================================
// 📱 HOOK PARA PWA E FUNCIONALIDADES MOBILE (MVP 4)
// ===================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { PWAService } from '@/services/mobile/pwaService';
import {
  NetworkStatus,
  MobileViewport,
  OfflineData,
  PushNotification,
  LocationData,
  TouchGesture,
  SwipeConfig
} from '@/types/mobile';

/**
 * Hook principal para funcionalidades PWA
 */
export function usePWA() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    connection_type: 'unknown',
    effective_type: '4g',
    downlink: 10,
    rtt: 100,
    save_data: false
  });

  /**
   * Inicializar PWA
   */
  useEffect(() => {
    const initializePWA = async () => {
      try {
        await PWAService.initialize();
        setIsInitialized(true);
        setCanInstall(PWAService.canInstall());
        setIsInstalled(PWAService.isRunningAsPWA());
        
        console.log('✅ [usePWA] PWA inicializado');
      } catch (error) {
        console.error('❌ [usePWA] Erro ao inicializar PWA:', error);
      }
    };

    initializePWA();
  }, []);

  /**
   * Monitorar status da rede
   */
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(PWAService.getNetworkStatus());
    };

    // Atualizar status inicial
    updateNetworkStatus();

    // Listeners para mudanças de rede
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    window.addEventListener('networkchange', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      window.removeEventListener('networkchange', updateNetworkStatus);
    };
  }, []);

  /**
   * Solicitar instalação do PWA
   */
  const requestInstall = useCallback(async () => {
    try {
      const installed = await PWAService.requestInstall();
      if (installed) {
        setIsInstalled(true);
        setCanInstall(false);
      }
      return installed;
    } catch (error) {
      console.error('❌ [usePWA] Erro ao solicitar instalação:', error);
      return false;
    }
  }, []);

  /**
   * Solicitar permissão para notificações
   */
  const requestNotificationPermission = useCallback(async () => {
    try {
      const granted = await PWAService.requestNotificationPermission();
      return granted;
    } catch (error) {
      console.error('❌ [usePWA] Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  }, []);

  /**
   * Enviar notificação local
   */
  const sendNotification = useCallback(async (
    notification: Omit<PushNotification, 'id' | 'timestamp'>
  ) => {
    try {
      await PWAService.sendLocalNotification(notification);
    } catch (error) {
      console.error('❌ [usePWA] Erro ao enviar notificação:', error);
    }
  }, []);

  return {
    isInitialized,
    canInstall,
    isInstalled,
    networkStatus,
    isOnline: networkStatus.online,
    requestInstall,
    requestNotificationPermission,
    sendNotification
  };
}

/**
 * Hook para detecção de dispositivo mobile
 */
export function useMobileDetection() {
  const [viewport, setViewport] = useState<MobileViewport>(() => 
    PWAService.getMobileViewport()
  );

  useEffect(() => {
    const updateViewport = () => {
      setViewport(PWAService.getMobileViewport());
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  return {
    ...viewport,
    isLandscape: !viewport.is_portrait,
    isDesktop: !viewport.is_mobile && !viewport.is_tablet
  };
}

/**
 * Hook para modo offline
 */
export function useOfflineMode() {
  const [offlineQueue, setOfflineQueue] = useState<OfflineData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Adicionar item à fila offline
   */
  const addToQueue = useCallback((item: Omit<OfflineData, 'timestamp' | 'sync_status' | 'retry_count'>) => {
    PWAService.addToOfflineQueue(item);
    
    // Atualizar estado local (simulado)
    const offlineItem: OfflineData = {
      ...item,
      timestamp: Date.now(),
      sync_status: 'pending',
      retry_count: 0
    };
    
    setOfflineQueue(prev => [...prev, offlineItem]);
  }, []);

  /**
   * Sincronizar fila offline
   */
  const syncQueue = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    
    try {
      setIsSyncing(true);
      await PWAService.syncOfflineQueue();
      
      // Limpar itens sincronizados do estado local
      setOfflineQueue(prev => prev.filter(item => item.sync_status !== 'synced'));
      
    } catch (error) {
      console.error('❌ [useOfflineMode] Erro na sincronização:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  /**
   * Auto-sincronização quando voltar online
   */
  useEffect(() => {
    const handleOnline = () => {
      if (offlineQueue.length > 0) {
        syncQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue.length, syncQueue]);

  return {
    offlineQueue,
    isSyncing,
    addToQueue,
    syncQueue,
    hasQueuedItems: offlineQueue.length > 0,
    pendingCount: offlineQueue.filter(item => item.sync_status === 'pending').length
  };
}

/**
 * Hook para gestos touch
 */
export function useSwipeGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  config: SwipeConfig = {
    threshold: 50,
    velocity_threshold: 0.3,
    direction_threshold: 30
  }
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = touchEnd.time - touchStart.time;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Verificar se atende aos critérios mínimos
    if (distance < config.threshold || velocity < config.velocity_threshold) {
      return;
    }

    // Determinar direção principal
    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
    
    if (angle < config.direction_threshold) {
      // Swipe horizontal
      if (deltaX > 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX < 0 && onSwipeRight) {
        onSwipeRight();
      }
    } else if (angle > 90 - config.direction_threshold) {
      // Swipe vertical
      if (deltaY > 0 && onSwipeUp) {
        onSwipeUp();
      } else if (deltaY < 0 && onSwipeDown) {
        onSwipeDown();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, config]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isGesturing: touchStart !== null
  };
}

/**
 * Hook para câmera
 */
export function useCamera() {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    // Verificar suporte à câmera
    setIsSupported('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices);
  }, []);

  /**
   * Solicitar permissão da câmera
   */
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Parar stream de teste
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('❌ [useCamera] Erro ao solicitar permissão:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Capturar foto
   */
  const capturePhoto = useCallback(async () => {
    if (!isSupported || !hasPermission) return null;

    try {
      setIsCapturing(true);
      const file = await PWAService.capturePhoto();
      return file;
    } catch (error) {
      console.error('❌ [useCamera] Erro ao capturar foto:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isSupported, hasPermission]);

  return {
    isSupported,
    hasPermission,
    isCapturing,
    requestPermission,
    capturePhoto
  };
}

/**
 * Hook para geolocalização
 */
export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState('geolocation' in navigator);

  /**
   * Obter localização atual
   */
  const getCurrentLocation = useCallback(async () => {
    if (!isSupported) {
      setError('Geolocalização não suportada');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const locationData = await PWAService.getCurrentLocation();
      setLocation(locationData);
      return locationData;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao obter localização';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Limpar localização
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isLoading,
    error,
    isSupported,
    getCurrentLocation,
    clearLocation,
    hasLocation: location !== null
  };
}
