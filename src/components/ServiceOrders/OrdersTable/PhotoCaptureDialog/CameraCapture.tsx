
import React, { RefObject, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import CameraContextWarning from '@/components/camera/CameraContextWarning';

interface CameraCaptureProps {
  onCapture: () => void;
  onCancel: () => void;
  videoRef: RefObject<HTMLVideoElement>;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel, videoRef }) => {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Verificar permissão da câmera
  const checkCameraPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(permission.state as any);

        // Escutar mudanças na permissão
        permission.onchange = () => {
          setPermissionStatus(permission.state as any);
        };
      } else {
        // Fallback para navegadores que não suportam Permissions API
        setPermissionStatus('prompt');
      }
    } catch (error) {
      console.warn('Permissions API não suportada, tentando acesso direto');
      setPermissionStatus('prompt');
    }
  };

  // Solicitar permissão e iniciar câmera
  const requestCameraAccess = async () => {
    setIsRequestingPermission(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setPermissionStatus('granted');
      toast.success('Câmera ativada com sucesso!');

    } catch (error: any) {
      console.error('Error accessing camera:', error);

      if (error.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        toast.error('Permissão da câmera negada. Ative a câmera nas configurações do navegador.');
      } else if (error.name === 'NotFoundError') {
        toast.error('Nenhuma câmera encontrada no dispositivo.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Câmera está sendo usada por outro aplicativo.');
      } else {
        toast.error('Erro ao acessar a câmera. Verifique as permissões.');
      }

      onCancel();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  useEffect(() => {
    checkCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [videoRef]);

  // Auto-iniciar câmera se permissão já foi concedida
  useEffect(() => {
    if (permissionStatus === 'granted') {
      requestCameraAccess();
    }
  }, [permissionStatus]);

  // Verificar se está em contexto inseguro (HTTP + IP)
  const isInsecureContext = !window.isSecureContext &&
                           location.protocol === 'http:' &&
                           /^192\.168\.|^10\.|^172\./.test(location.hostname);

  // Fallback para upload de arquivo em contexto inseguro
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        // Simular captura de foto
        onCapture();
        toast.success('Foto carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Verificar contexto seguro
  const isSecureContext = window.isSecureContext ||
                         location.protocol === 'https:' ||
                         location.hostname === 'localhost' ||
                         location.hostname === '127.0.0.1';

  // Se não é contexto seguro, mostrar aviso
  if (!isSecureContext) {
    return (
      <div className="space-y-4">
        <CameraContextWarning />
        <div className="relative aspect-video rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
          <div className="text-center p-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Câmera indisponível em HTTP</p>
            <p className="text-xs text-gray-500 mb-4">
              Use localhost ou HTTPS para acessar a câmera
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newUrl = `http://localhost:${location.port || '8082'}${location.pathname}`;
                window.open(newUrl, '_blank');
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir localhost
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Renderizar baseado no status da permissão
  if (permissionStatus === 'checking') {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Verificando permissões da câmera...</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-red-50 dark:bg-red-900/20 flex items-center justify-center border-2 border-red-200 dark:border-red-800">
          <div className="text-center p-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Permissão da câmera negada</p>
            <p className="text-xs text-gray-500 mb-4">
              Para usar a câmera, ative a permissão nas configurações do navegador e recarregue a página.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Recarregar Página
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'prompt' || isRequestingPermission) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border-2 border-blue-200 dark:border-blue-800">
          <div className="text-center p-4">
            <Camera className="h-12 w-12 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
              {isRequestingPermission ? 'Solicitando acesso à câmera...' : 'Permissão da câmera necessária'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Clique no botão abaixo para permitir o acesso à câmera.
            </p>
            <Button
              onClick={requestCameraAccess}
              disabled={isRequestingPermission}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {isRequestingPermission ? 'Solicitando...' : 'Permitir Câmera'}
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Câmera ativa (permissionStatus === 'granted')
  return (
    <div className="space-y-4">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex justify-center gap-2">
        <Button onClick={onCapture} className="gap-2">
          <Camera className="h-4 w-4" />
          Capturar Foto
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default CameraCapture;
