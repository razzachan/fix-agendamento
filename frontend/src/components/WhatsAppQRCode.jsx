import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, RefreshCw } from 'lucide-react';

const WhatsAppQRCode = () => {
  const [qrCodeData, setQrCodeData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  // Conectar ao WebSocket para receber QR codes em tempo real
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // Conecta ao WebSocket do backend
      wsRef.current = new WebSocket('ws://localhost:3001/whatsapp-qr');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setError('');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'qr') {
          setQrCodeData(data.qr);
          generateQRCode(data.qr);
          setIsLoading(false);
        } else if (data.type === 'ready') {
          setIsConnected(true);
          setIsLoading(false);
          setQrCodeData('');
        } else if (data.type === 'disconnected') {
          setIsConnected(false);
          setQrCodeData('');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setError('Erro de conexão com o servidor');
        setIsLoading(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        // Reconectar após 3 segundos
        setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const generateQRCode = async (data) => {
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, data, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      setError('Erro ao gerar QR code');
    }
  };

  const handleInitializeWhatsApp = () => {
    setIsLoading(true);
    setError('');
    
    // Enviar comando para inicializar WhatsApp
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'initialize' }));
    } else {
      // Fazer requisição HTTP se WebSocket não estiver disponível
      fetch('/api/whatsapp/initialize', { method: 'POST' })
        .catch(error => {
          console.error('Erro ao inicializar WhatsApp:', error);
          setError('Erro ao inicializar WhatsApp');
          setIsLoading(false);
        });
    }
  };

  const handleReconnect = () => {
    setIsConnected(false);
    setQrCodeData('');
    handleInitializeWhatsApp();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp Web
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {isConnected ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 font-medium">✅ WhatsApp Conectado!</p>
              <p className="text-green-600 text-sm">Pronto para enviar mensagens</p>
            </div>
            <Button 
              onClick={handleReconnect}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
          </div>
        ) : qrCodeData ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <canvas 
                ref={canvasRef}
                className="border border-gray-200 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">📱 Escaneie com seu WhatsApp:</p>
              <ol className="text-xs text-gray-600 space-y-1 text-left">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque nos 3 pontos (menu)</li>
                <li>3. Selecione "Dispositivos conectados"</li>
                <li>4. Toque em "Conectar um dispositivo"</li>
                <li>5. Aponte a câmera para o QR code</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Button 
              onClick={handleInitializeWhatsApp}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inicializando...
                </>
              ) : (
                'Conectar WhatsApp'
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Clique para gerar o QR code de conexão
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppQRCode;
