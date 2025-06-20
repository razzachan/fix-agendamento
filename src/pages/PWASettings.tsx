// ===================================================================
// ⚙️ PÁGINA DE CONFIGURAÇÕES PWA (MVP 4)
// ===================================================================

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone,
  Settings,
  Bell,
  Download,
  Wifi,
  Database,
  Zap,
  Info,
  RefreshCw
} from 'lucide-react';
import { PWANotifications } from '@/components/pwa/PWANotifications';
import { usePWA, useMobileDetection, useOfflineMode } from '@/hooks/usePWA';
import { Toaster } from '@/components/ui/sonner';

// Criar instância do QueryClient para esta página
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
});

/**
 * Página principal de configurações PWA
 */
export default function PWASettings() {
  const { 
    isInitialized,
    canInstall, 
    isInstalled, 
    isOnline,
    networkStatus,
    requestInstall 
  } = usePWA();
  
  const { 
    isMobile, 
    isTablet, 
    width, 
    height,
    isLandscape 
  } = useMobileDetection();
  
  const { 
    offlineQueue, 
    isSyncing, 
    hasQueuedItems,
    pendingCount,
    syncQueue 
  } = useOfflineMode();

  /**
   * Instalar PWA
   */
  const handleInstallPWA = async () => {
    try {
      await requestInstall();
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
    }
  };

  /**
   * Limpar cache do PWA
   */
  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <Smartphone className="h-8 w-8 text-primary" />
                  Configurações PWA
                </h1>
                <p className="text-muted-foreground">
                  Configure funcionalidades mobile e offline do Fix Fogões
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'default' : 'destructive'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
                {isInstalled && (
                  <Badge variant="secondary">
                    PWA Instalado
                  </Badge>
                )}
              </div>
            </div>

            {/* Tabs principais */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="offline" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Modo Offline
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Avançado
                </TabsTrigger>
              </TabsList>

              {/* Aba: Visão Geral */}
              <TabsContent value="overview" className="space-y-6">
                {/* Status do PWA */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isInstalled ? 'bg-green-100' : 'bg-blue-100'}`}>
                          <Download className={`h-5 w-5 ${isInstalled ? 'text-green-600' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status PWA</p>
                          <p className="text-lg font-bold">
                            {isInstalled ? 'Instalado' : canInstall ? 'Disponível' : 'Não Disponível'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                          <Wifi className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Conexão</p>
                          <p className="text-lg font-bold">
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                          {networkStatus && (
                            <p className="text-xs text-muted-foreground">
                              {networkStatus.effective_type} • {networkStatus.downlink}Mbps
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Smartphone className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Dispositivo</p>
                          <p className="text-lg font-bold">
                            {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {width}x{height} • {isLandscape ? 'Landscape' : 'Portrait'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Ações rápidas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription>
                      Configurações e ações principais do PWA
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!isInstalled && canInstall && (
                        <Button onClick={handleInstallPWA} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Instalar App na Tela Inicial
                        </Button>
                      )}
                      
                      {hasQueuedItems && (
                        <Button 
                          onClick={syncQueue} 
                          disabled={isSyncing}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          Sincronizar Dados ({pendingCount})
                        </Button>
                      )}
                      
                      <Button 
                        onClick={handleClearCache} 
                        variant="outline"
                        className="w-full"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Limpar Cache
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Informações do sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Sistema</CardTitle>
                    <CardDescription>
                      Detalhes técnicos sobre o PWA
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2">PWA</h4>
                        <div className="space-y-1 text-muted-foreground">
                          <div>Inicializado: {isInitialized ? 'Sim' : 'Não'}</div>
                          <div>Service Worker: {isInitialized ? 'Ativo' : 'Inativo'}</div>
                          <div>Manifest: Configurado</div>
                          <div>Ícones: Disponíveis</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Funcionalidades</h4>
                        <div className="space-y-1 text-muted-foreground">
                          <div>Modo Offline: Ativo</div>
                          <div>Notificações: {Notification?.permission || 'Não suportado'}</div>
                          <div>Geolocalização: {'geolocation' in navigator ? 'Suportado' : 'Não suportado'}</div>
                          <div>Câmera: {'mediaDevices' in navigator ? 'Suportado' : 'Não suportado'}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba: Notificações */}
              <TabsContent value="notifications">
                <PWANotifications />
              </TabsContent>

              {/* Aba: Modo Offline */}
              <TabsContent value="offline" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Modo Offline
                    </CardTitle>
                    <CardDescription>
                      Gerencie dados offline e sincronização
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{offlineQueue.length}</div>
                        <div className="text-sm text-muted-foreground">Itens na Fila</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
                        <div className="text-sm text-muted-foreground">Pendentes</div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className={`text-2xl font-bold ${isSyncing ? 'text-blue-600' : 'text-green-600'}`}>
                          {isSyncing ? 'Sync' : 'OK'}
                        </div>
                        <div className="text-sm text-muted-foreground">Status</div>
                      </div>
                    </div>

                    {hasQueuedItems && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Itens Pendentes de Sincronização</h4>
                        <div className="space-y-2">
                          {offlineQueue.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <span className="font-medium">{item.type}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {item.action}
                                </span>
                              </div>
                              <Badge variant={
                                item.sync_status === 'pending' ? 'secondary' :
                                item.sync_status === 'syncing' ? 'default' :
                                item.sync_status === 'failed' ? 'destructive' : 'outline'
                              }>
                                {item.sync_status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba: Avançado */}
              <TabsContent value="advanced" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Configurações Avançadas
                    </CardTitle>
                    <CardDescription>
                      Configurações técnicas e de desenvolvimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Configurações Avançadas</h3>
                      <p className="text-muted-foreground">
                        Funcionalidades avançadas serão implementadas conforme necessário
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Toaster para notificações */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))'
            }
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

/**
 * Metadados da página para SEO e navegação
 */
PWASettings.displayName = 'PWASettings';
PWASettings.title = 'Configurações PWA';
PWASettings.description = 'Configure funcionalidades mobile e offline';
PWASettings.requiresAuth = true;
PWASettings.allowedRoles = ['admin', 'technician', 'workshop'];
