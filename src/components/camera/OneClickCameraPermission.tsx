import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CheckCircle, AlertCircle, Shield, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { checkCameraPermission, requestCameraPermission, type CameraPermissionStatus } from '@/utils/cameraPermissions';

interface OneClickCameraPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showInstructions?: boolean;
}

const OneClickCameraPermission: React.FC<OneClickCameraPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  showInstructions = true
}) => {
  const [status, setStatus] = useState<CameraPermissionStatus>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
    checkSecureContext();
  }, []);

  const checkPermissionStatus = async () => {
    const result = await checkCameraPermission();
    setStatus(result.status);
    
    if (result.status === 'granted') {
      onPermissionGranted?.();
    }
  };

  const checkSecureContext = () => {
    // Verificar se está em contexto seguro (HTTPS ou localhost)
    const isSecure = window.isSecureContext || 
                    location.protocol === 'https:' || 
                    location.hostname === 'localhost' ||
                    location.hostname === '127.0.0.1';
    setIsSecureContext(isSecure);
  };

  const handleActivatePermission = async () => {
    setIsRequesting(true);
    
    try {
      const result = await requestCameraPermission();
      setStatus(result.status);
      
      if (result.status === 'granted') {
        toast.success('🎉 Câmera ativada com sucesso!');
        onPermissionGranted?.();
      } else {
        toast.error(result.message || 'Erro ao ativar câmera');
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro inesperado ao ativar câmera');
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  // Se já tem permissão, não mostrar nada
  if (status === 'granted') {
    return null;
  }

  // Contexto inseguro (HTTP em IP)
  if (!isSecureContext) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Shield className="h-12 w-12 text-amber-500" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Contexto Inseguro Detectado
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                A câmera só funciona em HTTPS. Você está acessando via HTTP.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                🚀 Soluções Rápidas:
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600">1.</span>
                  <span>Acesse via <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">https://</code> em vez de <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">http://</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600">2.</span>
                  <span>Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">localhost:8082</code> em vez do IP</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-blue-600">3.</span>
                  <span>Configure HTTPS local (execute <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">node setup-https.js</code>)</span>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <Smartphone className="h-4 w-4" />
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permissão negada
  if (status === 'denied') {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Permissão da Câmera Negada
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Para usar a câmera, você precisa ativar a permissão nas configurações do navegador.
              </p>
            </div>

            {showInstructions && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  📱 Como ativar no mobile:
                </h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>1. Toque no ícone de cadeado/configurações na barra de endereço</div>
                  <div>2. Ative a permissão "Câmera"</div>
                  <div>3. Recarregue a página</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button 
                onClick={handleActivatePermission}
                disabled={isRequesting}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {isRequesting ? 'Tentando...' : 'Tentar Novamente'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Recarregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Solicitar permissão (estado inicial)
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Camera className="h-16 w-16 text-blue-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Ativar Câmera
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Para capturar fotos dos equipamentos, precisamos acessar sua câmera.
            </p>
          </div>

          <Button 
            onClick={handleActivatePermission}
            disabled={isRequesting}
            size="lg"
            className="gap-3 px-8 py-3 text-lg"
          >
            {isRequesting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Solicitando Permissão...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                Ativar Câmera
              </>
            )}
          </Button>

          {showInstructions && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-left">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                ℹ️ O que acontecerá:
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>• O navegador solicitará permissão para acessar a câmera</div>
                <div>• Toque em "Permitir" quando aparecer a solicitação</div>
                <div>• A câmera será ativada automaticamente</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OneClickCameraPermission;
