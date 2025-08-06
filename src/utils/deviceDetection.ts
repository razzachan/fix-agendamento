/**
 * Utilitários para detecção de dispositivo e ambiente
 */

/**
 * Detecta se está rodando em um TWA (Trusted Web Activity)
 */
export function isTWA(): boolean {
  // Verificar se está em um TWA
  if (typeof window !== 'undefined') {
    // TWA geralmente tem display-mode: standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Verificar user agent para Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Verificar se não é um navegador comum
    const isNotBrowser = !window.location.href.includes('chrome://') && 
                        !window.location.href.includes('about:');
    
    // TWA geralmente não tem barra de endereço visível
    const hasNoAddressBar = window.outerHeight - window.innerHeight < 100;
    
    return isStandalone && isAndroid && isNotBrowser && hasNoAddressBar;
  }
  
  return false;
}

/**
 * Detecta se está em um dispositivo móvel
 */
export function isMobile(): boolean {
  if (typeof window !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Detecta se está em Android
 */
export function isAndroid(): boolean {
  if (typeof window !== 'undefined') {
    return /Android/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Detecta se está em iOS
 */
export function isIOS(): boolean {
  if (typeof window !== 'undefined') {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  return false;
}

/**
 * Detecta se está em modo standalone (PWA instalado)
 */
export function isStandalone(): boolean {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }
  return false;
}

/**
 * Detecta se suporta câmera
 */
export function supportsCameraAPI(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Detecta o tipo de ambiente
 */
export function getEnvironmentType(): 'twa' | 'pwa' | 'browser' | 'mobile-browser' {
  if (isTWA()) {
    return 'twa';
  }
  
  if (isStandalone()) {
    return 'pwa';
  }
  
  if (isMobile()) {
    return 'mobile-browser';
  }
  
  return 'browser';
}

/**
 * Configurações de câmera otimizadas por ambiente
 */
export function getCameraConstraints(): MediaStreamConstraints {
  const envType = getEnvironmentType();
  
  const baseConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: 'environment'
    }
  };
  
  switch (envType) {
    case 'twa':
      // Configurações otimizadas para TWA
      return {
        ...baseConstraints,
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        }
      };
      
    case 'pwa':
      // Configurações para PWA
      return {
        ...baseConstraints,
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 24, max: 30 }
        }
      };
      
    case 'mobile-browser':
      // Configurações para navegador móvel
      return {
        ...baseConstraints,
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
    default:
      // Configurações padrão para desktop
      return baseConstraints;
  }
}

/**
 * Verifica se precisa de permissões especiais
 */
export function needsSpecialPermissions(): boolean {
  return isTWA() || isAndroid();
}

/**
 * Obtém instruções de permissão específicas do ambiente
 */
export function getPermissionInstructions(): string[] {
  const envType = getEnvironmentType();
  
  switch (envType) {
    case 'twa':
      return [
        'Vá em Configurações do Android',
        'Apps → Fix Fogões → Permissões',
        'Ative a permissão "Câmera"',
        'Reinicie o aplicativo'
      ];
      
    case 'pwa':
      return [
        'Clique no ícone de cadeado na barra de endereço',
        'Permita o acesso à câmera',
        'Recarregue a página se necessário'
      ];
      
    case 'mobile-browser':
      return [
        'Toque no ícone de câmera na barra de endereço',
        'Selecione "Permitir"',
        'Se não aparecer, verifique as configurações do navegador'
      ];
      
    default:
      return [
        'Clique em "Permitir" quando solicitado',
        'Verifique as configurações do navegador se necessário'
      ];
  }
}
