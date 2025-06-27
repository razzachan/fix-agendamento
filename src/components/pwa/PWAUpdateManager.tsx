// ===================================================================
// 🔄 GERENCIADOR DE ATUALIZAÇÕES PWA - FIX FOGÕES
// ===================================================================

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface PWAUpdateManagerProps {
  autoUpdate?: boolean;
  showToast?: boolean;
}

export function PWAUpdateManager({ 
  autoUpdate = false, 
  showToast = true 
}: PWAUpdateManagerProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newVersion, setNewVersion] = useState<string>('');

  useEffect(() => {
    // Registrar listener para mensagens do Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('🔄 [PWAUpdate] Nova versão detectada:', event.data.version);
        setNewVersion(event.data.version);
        setUpdateAvailable(true);

        if (showToast) {
          toast.info('Nova versão disponível!', {
            description: 'Clique para atualizar o aplicativo',
            action: {
              label: 'Atualizar',
              onClick: handleUpdate
            },
            duration: 10000
          });
        }

        // Auto-update se habilitado
        if (autoUpdate) {
          setTimeout(() => {
            handleUpdate();
          }, 2000);
        }
      }
    };

    // Registrar listener
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Verificar se há Service Worker aguardando
    checkForWaitingSW();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [autoUpdate, showToast]);

  /**
   * Verificar se há Service Worker aguardando ativação
   */
  const checkForWaitingSW = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        console.log('🔄 [PWAUpdate] Service Worker aguardando ativação');
        setUpdateAvailable(true);
      }

      // Verificar atualizações periodicamente
      registration?.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 [PWAUpdate] Nova versão instalada');
              setUpdateAvailable(true);
            }
          });
        }
      });

    } catch (error) {
      console.error('❌ [PWAUpdate] Erro ao verificar SW:', error);
    }
  };

  /**
   * Aplicar atualização
   */
  const handleUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;

    setIsUpdating(true);

    try {
      console.log('🔄 [PWAUpdate] Iniciando atualização...');

      // 1. Limpar todos os caches manualmente
      await clearAllCaches();

      // 2. Ativar Service Worker aguardando
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 3. Aguardar um pouco para o SW ativar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Recarregar a página
      console.log('✅ [PWAUpdate] Recarregando aplicação...');
      window.location.reload();

    } catch (error) {
      console.error('❌ [PWAUpdate] Erro na atualização:', error);
      toast.error('Erro ao atualizar. Tente recarregar manualmente.');
      setIsUpdating(false);
    }
  };

  /**
   * Limpar todos os caches
   */
  const clearAllCaches = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`🗑️ [PWAUpdate] Limpando ${cacheNames.length} caches...`);
        
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ [PWAUpdate] Removendo cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        
        console.log('✅ [PWAUpdate] Todos os caches removidos');
      }

      // Limpar localStorage de cache também
      Object.keys(localStorage).forEach(key => {
        if (key.includes('cache') || key.includes('sw-') || key.includes('workbox')) {
          localStorage.removeItem(key);
        }
      });

    } catch (error) {
      console.error('❌ [PWAUpdate] Erro ao limpar caches:', error);
    }
  };

  /**
   * Dispensar atualização
   */
  const dismissUpdate = () => {
    setUpdateAvailable(false);
    toast.dismiss();
  };

  // Não renderizar se não há atualização disponível
  if (!updateAvailable) return null;

  return (
    <Alert className="fixed bottom-4 right-4 w-80 z-50 border-blue-200 bg-blue-50">
      <Download className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3">
        <div>
          <strong>Nova versão disponível!</strong>
          {newVersion && (
            <div className="text-xs text-gray-600 mt-1">
              Versão {newVersion}
            </div>
          )}
          <div className="text-sm mt-1">
            Atualize para obter as últimas melhorias e correções.
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-3 w-3" />
                Atualizar
              </>
            )}
          </Button>
          
          <Button
            onClick={dismissUpdate}
            variant="outline"
            size="sm"
            disabled={isUpdating}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook para gerenciar atualizações PWA
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkForUpdates = async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return registration.waiting !== null;
      }
      return false;
    } catch (error) {
      console.error('❌ [PWAUpdate] Erro ao verificar atualizações:', error);
      return false;
    }
  };

  const forceUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Limpar todos os caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Recarregar
      window.location.reload();
    } catch (error) {
      console.error('❌ [PWAUpdate] Erro na atualização forçada:', error);
      setIsUpdating(false);
    }
  };

  return {
    updateAvailable,
    isUpdating,
    checkForUpdates,
    forceUpdate
  };
}
