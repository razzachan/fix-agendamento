import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Camera, ExternalLink } from 'lucide-react';

const CameraContextWarning: React.FC = () => {
  const isSecureContext = window.isSecureContext || 
                         location.protocol === 'https:' || 
                         location.hostname === 'localhost' ||
                         location.hostname === '127.0.0.1';

  const isLocalIP = /^192\.168\.|^10\.|^172\./.test(location.hostname);

  // Se está em contexto seguro, não mostrar aviso
  if (isSecureContext) {
    return null;
  }

  // Se está em IP local (HTTP), mostrar aviso simples
  if (isLocalIP) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 mb-4">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <strong>Câmera indisponível:</strong> Acesse via{' '}
              <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">
                localhost:8082
              </code>{' '}
              para usar a câmera no desenvolvimento.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newUrl = `http://localhost:${location.port || '8082'}${location.pathname}`;
                window.open(newUrl, '_blank');
              }}
              className="ml-4 gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir localhost
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default CameraContextWarning;
