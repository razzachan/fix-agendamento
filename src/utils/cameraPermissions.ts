/**
 * Utilitário para gerenciar permissões de câmera
 */

export type CameraPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface CameraPermissionResult {
  status: CameraPermissionStatus;
  message?: string;
}

/**
 * Verifica o status atual da permissão da câmera
 */
export async function checkCameraPermission(): Promise<CameraPermissionResult> {
  try {
    // Verificar se a API de permissões está disponível
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return {
          status: permission.state as CameraPermissionStatus,
          message: getPermissionMessage(permission.state as CameraPermissionStatus)
        };
      } catch (error) {
        console.warn('Permissions API não suportada para câmera:', error);
      }
    }

    // Fallback: tentar acessar a câmera diretamente para verificar
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Parar imediatamente
      return {
        status: 'granted',
        message: 'Permissão da câmera concedida'
      };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        return {
          status: 'denied',
          message: 'Permissão da câmera negada'
        };
      }
      return {
        status: 'unknown',
        message: 'Não foi possível verificar a permissão da câmera'
      };
    }
  } catch (error) {
    console.error('Erro ao verificar permissão da câmera:', error);
    return {
      status: 'unknown',
      message: 'Erro ao verificar permissão da câmera'
    };
  }
}

/**
 * Solicita permissão da câmera
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    // Parar o stream imediatamente após obter permissão
    stream.getTracks().forEach(track => track.stop());
    
    return {
      status: 'granted',
      message: 'Permissão da câmera concedida com sucesso'
    };
  } catch (error: any) {
    console.error('Erro ao solicitar permissão da câmera:', error);
    
    let status: CameraPermissionStatus = 'denied';
    let message = 'Erro ao solicitar permissão da câmera';
    
    switch (error.name) {
      case 'NotAllowedError':
        status = 'denied';
        message = 'Permissão da câmera negada. Ative a câmera nas configurações do navegador.';
        break;
      case 'NotFoundError':
        status = 'denied';
        message = 'Nenhuma câmera encontrada no dispositivo.';
        break;
      case 'NotReadableError':
        status = 'denied';
        message = 'Câmera está sendo usada por outro aplicativo.';
        break;
      case 'OverconstrainedError':
        status = 'denied';
        message = 'Configurações da câmera não suportadas.';
        break;
      default:
        status = 'unknown';
        message = 'Erro desconhecido ao acessar a câmera.';
    }
    
    return { status, message };
  }
}

/**
 * Inicia o stream da câmera
 */
export async function startCameraStream(constraints: MediaStreamConstraints = {}): Promise<{
  stream?: MediaStream;
  error?: string;
}> {
  try {
    const defaultConstraints: MediaStreamConstraints = {
      video: { facingMode: 'environment' },
      audio: false,
      ...constraints
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
    return { stream };
  } catch (error: any) {
    console.error('Erro ao iniciar stream da câmera:', error);
    
    let errorMessage = 'Erro ao acessar a câmera';
    
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage = 'Permissão da câmera negada. Ative a câmera nas configurações do navegador.';
        break;
      case 'NotFoundError':
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        break;
      case 'NotReadableError':
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
        break;
      case 'OverconstrainedError':
        errorMessage = 'Configurações da câmera não suportadas.';
        break;
    }
    
    return { error: errorMessage };
  }
}

/**
 * Para o stream da câmera
 */
export function stopCameraStream(stream: MediaStream): void {
  try {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  } catch (error) {
    console.error('Erro ao parar stream da câmera:', error);
  }
}

/**
 * Verifica se a câmera está disponível
 */
export function isCameraAvailable(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Obtém mensagem baseada no status da permissão
 */
function getPermissionMessage(status: CameraPermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Permissão da câmera concedida';
    case 'denied':
      return 'Permissão da câmera negada';
    case 'prompt':
      return 'Permissão da câmera será solicitada';
    default:
      return 'Status da permissão da câmera desconhecido';
  }
}

/**
 * Verifica se o dispositivo tem câmera traseira
 */
export async function hasBackCamera(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => 
      device.kind === 'videoinput' && 
      device.label.toLowerCase().includes('back')
    );
  } catch (error) {
    console.warn('Não foi possível verificar dispositivos de câmera:', error);
    return false;
  }
}

/**
 * Lista dispositivos de câmera disponíveis
 */
export async function getCameraDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Erro ao listar dispositivos de câmera:', error);
    return [];
  }
}
