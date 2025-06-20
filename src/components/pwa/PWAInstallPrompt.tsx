// ===================================================================
// 📱 COMPONENTE DE INSTALAÇÃO PWA (MVP 4)
// ===================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Smartphone,
  Download,
  CheckCircle,
  X,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Loader2,
  Bell
} from 'lucide-react';
import { usePWA, useMobileDetection } from '@/hooks/usePWA';

/**
 * Componente para prompt de instalação do PWA
 */
export function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  
  const { 
    canInstall, 
    isInstalled, 
    isOnline, 
    requestInstall,
    isInitialized 
  } = usePWA();
  
  const { 
    isMobile, 
    isTablet, 
    is_portrait 
  } = useMobileDetection();

  /**
   * Verificar se deve mostrar o prompt
   */
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setHasBeenDismissed(true);
      return;
    }

    // Mostrar apenas em dispositivos móveis e se pode instalar
    if ((isMobile || isTablet) && canInstall && !isInstalled && isInitialized) {
      // Aguardar um pouco antes de mostrar
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, isTablet, canInstall, isInstalled, isInitialized]);

  /**
   * Instalar PWA
   */
  const handleInstall = async () => {
    try {
      const installed = await requestInstall();
      if (installed) {
        setIsVisible(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
    }
  };

  /**
   * Dispensar prompt
   */
  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  /**
   * Não mostrar se foi dispensado ou não deve aparecer
   */
  if (!isVisible || hasBeenDismissed || isInstalled || !canInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Instalar Fix Fogões</CardTitle>
                <CardDescription className="text-xs">
                  Acesso rápido e funcionalidades offline
                </CardDescription>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status da conexão */}
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-600">Offline</span>
              </>
            )}
            
            <div className="flex items-center gap-1 ml-auto">
              <Signal className="h-3 w-3 text-muted-foreground" />
              <Battery className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          {/* Benefícios */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Benefícios do App:</h4>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Funciona offline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Acesso mais rápido</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Notificações push</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Interface otimizada</span>
              </div>
            </div>
          </div>

          {/* Informações do dispositivo */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {is_portrait ? 'Portrait' : 'Landscape'}
            </Badge>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar App
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDismiss}
              size="sm"
            >
              Agora Não
            </Button>
          </div>

          {/* Nota sobre instalação */}
          <Alert>
            <AlertDescription className="text-xs">
              O app será instalado na tela inicial do seu dispositivo. 
              Você pode desinstalar a qualquer momento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Componente para mostrar status do PWA (para desenvolvimento)
 */
export function PWAStatus() {
  const [isInstalling, setIsInstalling] = useState(false);

  const {
    isInitialized,
    canInstall,
    isInstalled,
    isOnline,
    networkStatus,
    requestInstall,
    notificationPermission,
    requestNotificationPermission
  } = usePWA();

  const {
    isMobile,
    isTablet,
    width,
    height
  } = useMobileDetection();

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await requestInstall();
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Em produção, mostrar apenas botão discreto de instalação
  if (import.meta.env.PROD) {
    if (!canInstall) return null;

    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleInstall}
          size="sm"
          className="bg-[#E5B034] hover:bg-[#d4a02e] text-white shadow-lg"
          disabled={isInstalling}
        >
          {isInstalling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Instalando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Instalar App
            </>
          )}
        </Button>
      </div>
    );
  }

  // Em desenvolvimento, mostrar painel completo
  return (
    <div className="fixed top-4 right-4 z-50">
      <Card className="w-64 text-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">PWA Status (Dev)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Inicializado:</span>
              <Badge variant={isInitialized ? 'default' : 'secondary'} className="ml-1">
                {isInitialized ? 'Sim' : 'Não'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Pode Instalar:</span>
              <Badge variant={canInstall ? 'default' : 'secondary'} className="ml-1">
                {canInstall ? 'Sim' : 'Não'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Instalado:</span>
              <Badge variant={isInstalled ? 'default' : 'secondary'} className="ml-1">
                {isInstalled ? 'Sim' : 'Não'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Online:</span>
              <Badge variant={isOnline ? 'default' : 'destructive'} className="ml-1">
                {isOnline ? 'Sim' : 'Não'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Dispositivo:</span>
              <Badge variant="outline" className="ml-1">
                {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
              </Badge>
            </div>

            <div>
              <span className="text-muted-foreground">Resolução:</span>
              <Badge variant="outline" className="ml-1">
                {width}x{height}
              </Badge>
            </div>
          </div>

          {/* Botões de Ação em Dev */}
          <div className="space-y-2 pt-2 border-t">
            {canInstall && (
              <Button
                onClick={handleInstall}
                size="sm"
                className="w-full text-xs"
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Instalando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-3 w-3" />
                    Instalar App
                  </>
                )}
              </Button>
            )}

            {notificationPermission === 'default' && (
              <Button
                onClick={requestNotificationPermission}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <Bell className="mr-2 h-3 w-3" />
                Ativar Notificações
              </Button>
            )}
          </div>

          {networkStatus && (
            <div className="pt-2 border-t">
              <div className="text-muted-foreground mb-1">Rede:</div>
              <div className="space-y-1">
                <div>Tipo: {networkStatus.connection_type}</div>
                <div>Velocidade: {networkStatus.effective_type}</div>
                <div>Downlink: {networkStatus.downlink}Mbps</div>
                <div>RTT: {networkStatus.rtt}ms</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
