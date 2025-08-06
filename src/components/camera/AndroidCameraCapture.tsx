import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AndroidCameraCaptureProps {
  onCapture: () => Promise<void> | void;
  onCancel: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const AndroidCameraCapture: React.FC<AndroidCameraCaptureProps> = ({
  onCapture,
  onCancel,
  videoRef,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    checkCameraPermission();
    return () => {
      // Cleanup stream on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Verificar permissão da câmera com fallbacks para Android
  const checkCameraPermission = async () => {
    try {
      // Método 1: Permissions API (pode não funcionar em TWA)
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionStatus(permission.state as any);
          
          if (permission.state === 'granted') {
            await startCameraStream();
          }
          return;
        } catch (error) {
          console.warn('Permissions API não disponível:', error);
        }
      }

      // Método 2: Tentar acessar câmera diretamente (melhor para Android/TWA)
      try {
        await startCameraStream();
        setPermissionStatus('granted');
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('prompt');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      setPermissionStatus('prompt');
    }
  };

  // Iniciar stream da câmera com fallbacks para Android
  const startCameraStream = async () => {
    // DEBUG: Toast para mostrar início
    toast.info('🎬 Iniciando câmera...');

    // Verificar se mediaDevices está disponível
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('❌ MediaDevices não suportado neste navegador');
      setError('Câmera não suportada neste dispositivo');
      return;
    }

    // DEBUG: Confirmar que MediaDevices está disponível
    toast.success('✅ MediaDevices disponível!');

    // Lista de configurações em ordem de preferência (do mais específico ao mais básico)
    const constraintsList = [
      // Configuração otimizada
      {
        audio: false,
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      // Configuração básica com facingMode
      {
        audio: false,
        video: {
          facingMode: 'environment'
        }
      },
      // Configuração mínima (qualquer câmera)
      {
        audio: false,
        video: true
      }
    ];

    let lastError: any = null;

    for (let i = 0; i < constraintsList.length; i++) {
      const constraints = constraintsList[i];

      // DEBUG: Mostrar tentativa atual
      toast.info(`🔄 Tentativa ${i + 1} de ${constraintsList.length}`);

      try {
        // DEBUG: Mostrar que está chamando getUserMedia
        toast.info('🎯 Solicitando acesso à câmera...');

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // DEBUG: Sucesso!
        toast.success('✅ Câmera ativada com sucesso!');
        console.log('🎉 [AndroidCamera] Stream criado:', stream);

        const videoTracks = stream.getVideoTracks();
        console.log('🔍 [AndroidCamera] Video tracks:', videoTracks);

        if (videoTracks.length === 0) {
          console.error('❌ [AndroidCamera] Nenhuma track de vídeo');
          toast.error('❌ Nenhuma track de vídeo encontrada');
          throw new Error('No video tracks');
        }

        console.log('📹 [AndroidCamera] Tracks OK, quantidade:', videoTracks.length);
        toast.info(`📹 ${videoTracks.length} track(s) de vídeo encontrada(s)`);

        console.log('🔍 [AndroidCamera] Verificando videoRef:', videoRef.current);
        if (videoRef.current) {
          console.log('✅ [AndroidCamera] VideoRef OK, prosseguindo...');
          // DEBUG: Atribuindo stream ao vídeo
          toast.info('📺 Conectando stream ao elemento de vídeo...', { duration: 5000 });

          // DIAGNÓSTICO DETALHADO DO STREAM
          console.log('🔍 [AndroidCamera] Stream completo:', stream);
          console.log('🔍 [AndroidCamera] Stream ativo:', stream.active);
          console.log('🔍 [AndroidCamera] Stream ID:', stream.id);

          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            const track = videoTracks[0];
            console.log('📹 [AndroidCamera] Track estado:', track.readyState);
            console.log('📹 [AndroidCamera] Track enabled:', track.enabled);
            console.log('📹 [AndroidCamera] Track muted:', track.muted);
            console.log('📹 [AndroidCamera] Track settings:', track.getSettings());

            setTimeout(() => {
              toast.info(`📹 Track: ${track.readyState} | Enabled: ${track.enabled}`, { duration: 5000 });
            }, 1000);
          }

          // Forçar propriedades ANTES de atribuir o stream
          const video = videoRef.current;
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          video.controls = false;

          // Atribuir o stream
          video.srcObject = stream;

          // FORÇAR atributos HTML também
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');

          // Aguardar o vídeo carregar
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              toast.error('❌ Elemento de vídeo não encontrado');
              reject(new Error('Video element not found'));
              return;
            }

            const timeoutId = setTimeout(() => {
              toast.error('⏰ Timeout: Vídeo demorou para carregar');
              reject(new Error('Timeout ao carregar vídeo'));
            }, 10000);

            videoRef.current.onloadedmetadata = () => {
              clearTimeout(timeoutId);

              // DEBUG: Metadata carregado
              const width = videoRef.current?.videoWidth || 0;
              const height = videoRef.current?.videoHeight || 0;
              toast.success(`📐 Vídeo carregado: ${width}x${height}`, { duration: 5000 });

              // Forçar propriedades do vídeo para Android
              if (videoRef.current) {
                videoRef.current.playsInline = true;
                videoRef.current.muted = true;
                videoRef.current.autoplay = true;

                // Forçar dimensões mínimas
                videoRef.current.style.width = '100%';
                videoRef.current.style.height = 'auto';
                videoRef.current.style.minHeight = '200px';
                videoRef.current.style.backgroundColor = 'black';
              }

              videoRef.current?.play()
                .then(() => {
                  toast.success('▶️ Vídeo iniciado com sucesso!', { duration: 5000 });

                  // DEBUG: Verificar se o vídeo está realmente tocando
                  setTimeout(() => {
                    if (videoRef.current) {
                      const v = videoRef.current;
                      const isPlaying = !v.paused && !v.ended && v.readyState > 2;

                      console.log('📊 [AndroidCamera] Status detalhado:');
                      console.log('  - Paused:', v.paused);
                      console.log('  - Ended:', v.ended);
                      console.log('  - ReadyState:', v.readyState);
                      console.log('  - VideoWidth:', v.videoWidth);
                      console.log('  - VideoHeight:', v.videoHeight);
                      console.log('  - CurrentTime:', v.currentTime);
                      console.log('  - SrcObject:', v.srcObject);

                      toast.info(`📺 Status: ${isPlaying ? '✅ TOCANDO' : '❌ PARADO'}`, { duration: 8000 });
                      toast.info(`📐 Vídeo: ${v.videoWidth}x${v.videoHeight}`, { duration: 8000 });

                      if (!isPlaying || v.videoWidth === 0) {
                        toast.warning('⚠️ Problema detectado! Aplicando correções...');

                        // CORREÇÃO 1: Reforçar propriedades
                        v.playsInline = true;
                        v.muted = true;
                        v.setAttribute('playsinline', 'true');
                        v.setAttribute('muted', 'true');

                        // CORREÇÃO 2: Forçar estilos
                        v.style.width = '100%';
                        v.style.height = '100%';
                        v.style.objectFit = 'cover';
                        v.style.transform = 'scale(1)';

                        // CORREÇÃO 3: Tentar play novamente
                        v.load();
                        setTimeout(() => {
                          v.play().catch(e => {
                            console.error('❌ [AndroidCamera] Erro no retry:', e);
                            toast.error(`❌ Falha no retry: ${e.message}`);
                          });
                        }, 500);
                      } else {
                        toast.success('🎉 Câmera funcionando perfeitamente!');
                      }
                    }
                  }, 2000);

                  setStreamActive(true);
                  resolve();
                })
                .catch((error) => {
                  clearTimeout(timeoutId);
                  toast.error(`❌ Erro ao iniciar vídeo: ${error.message}`);
                  console.error('❌ [AndroidCamera] Erro ao iniciar video:', error);
                  reject(error);
                });
            };

            videoRef.current.onerror = (error) => {
              clearTimeout(timeoutId);
              toast.error('❌ Erro no elemento de vídeo');
              reject(error);
            };
          });

          // DEBUG: Sucesso total!
          toast.success('🎉 Câmera totalmente ativada!');
          return; // Sucesso, sair do loop
        } else {
          console.error('❌ [AndroidCamera] VideoRef não encontrado!');
          toast.error('❌ Elemento de vídeo não encontrado');
        }
      } catch (error: any) {
        // DEBUG: Erro na tentativa
        toast.error(`❌ Tentativa ${i + 1} falhou: ${error.name}`);
        lastError = error;

        // Se não é a última tentativa, continuar
        if (i < constraintsList.length - 1) {
          toast.info('🔄 Tentando próxima configuração...');
          console.log('🔄 [AndroidCamera] Tentando próxima configuração...');
          continue;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    toast.error('💥 TODAS as tentativas falharam!');
    setStreamActive(false);

    // DEBUG: Mostrar tipo específico do erro
    if (lastError?.name === 'NotAllowedError') {
      toast.error('🚫 PERMISSÃO NEGADA - Verifique configurações');
      setError('Permissão da câmera negada');
    } else if (lastError?.name === 'NotFoundError') {
      toast.error('📷 CÂMERA NÃO ENCONTRADA');
      setError('Câmera não encontrada no dispositivo');
    } else if (lastError?.name === 'NotReadableError') {
      toast.error('🔒 CÂMERA EM USO por outro app');
      setError('Câmera está sendo usada por outro aplicativo');
    } else {
      toast.error(`❌ ERRO: ${lastError?.name || 'Desconhecido'}`);
      setError(`Erro: ${lastError?.message || 'Erro desconhecido'}`);
    }

    throw lastError || new Error('Falha ao iniciar câmera');
  };

  // Solicitar permissão com retry para Android
  const requestCameraAccess = async () => {
    console.log('🔐 [AndroidCamera] Solicitando acesso à câmera...');
    setIsRequestingPermission(true);

    try {
      await startCameraStream();
      setPermissionStatus('granted');
      setRetryCount(0);
      console.log('✅ [AndroidCamera] Acesso concedido com sucesso');
    } catch (error: any) {
      console.error('❌ [AndroidCamera] Erro ao solicitar acesso:', error);

      if (error.name === 'NotAllowedError') {
        console.log('🚫 [AndroidCamera] Permissão negada pelo usuário');
        setPermissionStatus('denied');
        toast.error('Permissão negada. Ative a câmera nas configurações do app.');
      } else if (error.name === 'NotReadableError' || error.message.includes('in use') || error.message.includes('being used')) {
        console.log('📱 [AndroidCamera] Câmera em uso por outro app');
        setPermissionStatus('prompt');
        toast.error('📱 Câmera em uso por outro app!');
        toast.info('💡 Feche WhatsApp, Instagram ou outros apps que usam câmera');
        toast.warning('🔄 Tente novamente após fechar os outros apps');

        // Não fazer retry automático neste caso
        setRetryCount(3); // Forçar parada dos retries
      } else if (error.name === 'OverconstrainedError') {
        console.log('⚙️ [AndroidCamera] Configuração não suportada');
        toast.error('⚙️ Configuração de câmera não suportada');
        toast.info('🔄 Tentando configuração mais simples...');

        // Tentar com configuração mais básica
        setRetryCount(prev => prev + 1);
        setTimeout(() => requestCameraAccess(), 1000);
      } else {
        console.log(`🔄 [AndroidCamera] Erro técnico, tentativa ${retryCount + 1}/3`);
        console.log(`🔍 [AndroidCamera] Error details:`, error.name, error.message);
        setPermissionStatus('prompt');

        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          toast.error(`Erro ao acessar câmera. Tentando novamente... (${retryCount + 2}/3)`);
          setTimeout(() => requestCameraAccess(), 2000);
        } else {
          console.log('💥 [AndroidCamera] Máximo de tentativas atingido');
          toast.error('Não foi possível acessar a câmera após várias tentativas.');
          toast.info(`🔍 Erro final: ${error.name} - ${error.message}`);
        }
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Retry connection
  const retryConnection = () => {
    setRetryCount(0);
    setPermissionStatus('checking');
    checkCameraPermission();
  };

  // Renderizar estado de carregamento
  if (permissionStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Verificando câmera...</p>
      </div>
    );
  }

  // Renderizar estado de permissão negada
  if (permissionStatus === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-2">
          <h3 className="font-semibold">Permissão da Câmera Negada</h3>
          <p className="text-sm text-muted-foreground">
            Para usar a câmera, você precisa permitir o acesso nas configurações do app.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {getPermissionInstructions().map((instruction, index) => (
              <p key={index}>{index + 1}. {instruction}</p>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={retryConnection} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={onCancel} size="sm">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Renderizar solicitação de permissão
  if (permissionStatus === 'prompt' || !streamActive) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Camera className="h-12 w-12 text-primary" />
        <div className="text-center space-y-2">
          <h3 className="font-semibold">Acesso à Câmera</h3>
          <p className="text-sm text-muted-foreground">
            Clique no botão abaixo para permitir o acesso à câmera.
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-orange-600">
              Tentativa {retryCount + 1} de 3
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={requestCameraAccess} 
            disabled={isRequestingPermission}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            {isRequestingPermission ? 'Solicitando...' : 'Permitir Câmera'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Câmera ativa
  return (
    <div className="space-y-4">
      {/* DEBUG INFO VISUAL */}
      <div className="bg-blue-100 p-2 text-xs rounded">
        <div>📱 Status: {streamActive ? '✅ Stream Ativo' : '❌ Stream Inativo'}</div>
        <div>🎥 Video Element: {videoRef.current ? '✅ Existe' : '❌ Não existe'}</div>
        <div>📐 Dimensões: {videoRef.current ? `${videoRef.current.videoWidth || 0}x${videoRef.current.videoHeight || 0}` : 'N/A'}</div>
        <div>🔄 Retry Count: {retryCount}</div>
      </div>

      {/* Preview da câmera */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-red-500 border-4 border-yellow-400">
        <div className="absolute top-2 left-2 bg-white px-2 py-1 text-xs z-10">
          📹 ÁREA DO VÍDEO
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          preload="metadata"
          className="w-full h-full object-cover border-2 border-green-500"
          style={{
            backgroundColor: 'blue',
            minHeight: '200px',
            width: '100%',
            height: '100%',
            display: 'block',
            visibility: 'visible'
          }}
          onLoadedMetadata={() => {
            console.log('📺 [AndroidCamera] Video metadata carregado');
            if (videoRef.current) {
              console.log('📐 [AndroidCamera] Dimensões do vídeo:',
                videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              toast.info(`📺 Vídeo: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`, { duration: 10000 });
            }
          }}
          onCanPlay={() => {
            console.log('▶️ [AndroidCamera] Video pode tocar');
            toast.success('▶️ Vídeo pronto para tocar!');
          }}
          onPlay={() => {
            console.log('🎬 [AndroidCamera] Video começou a tocar');
            toast.success('🎬 Vídeo tocando!');
          }}
          onError={(e) => {
            console.error('❌ [AndroidCamera] Erro no vídeo:', e);
            toast.error('❌ Erro no elemento de vídeo');
          }}
        />
        {!streamActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={async (e) => {
            console.log('🚀 [AndroidCamera] CLIQUE DETECTADO no botão Capturar Foto');
            console.log('🎯 [AndroidCamera] Event:', e);
            console.log('🔍 [AndroidCamera] Stream ativo:', streamActive);
            console.log('🎥 [AndroidCamera] Video ref:', videoRef.current);
            console.log('📐 [AndroidCamera] Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);

            // Prevenir propagação
            e.preventDefault();
            e.stopPropagation();

            if (!streamActive) {
              console.log('❌ [AndroidCamera] Stream não ativo');
              toast.error('Câmera não está ativa. Aguarde...');
              return;
            }

            if (!videoRef.current) {
              console.log('❌ [AndroidCamera] Video ref não encontrado');
              toast.error('Elemento de vídeo não encontrado.');
              return;
            }

            if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
              console.log('❌ [AndroidCamera] Video não carregado');
              toast.error('Vídeo ainda não carregou. Aguarde...');
              return;
            }

            try {
              console.log('📸 [AndroidCamera] Iniciando captura...');
              console.log('🔧 [AndroidCamera] Chamando onCapture...');
              await onCapture();
              console.log('✅ [AndroidCamera] Captura concluída com sucesso');
            } catch (error) {
              console.error('❌ [AndroidCamera] Erro na captura:', error);
              toast.error('Erro ao capturar foto. Tente novamente.');
            }
          }}
          onTouchStart={async (e) => {
            console.log('👆 [AndroidCamera] TOUCH START detectado');
            // Não fazer nada aqui, deixar o onClick lidar
          }}
          className="gap-2 relative z-50 min-h-[44px] min-w-[120px]"
          disabled={!streamActive || !videoRef.current}
          style={{
            touchAction: 'manipulation',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Camera className="h-4 w-4" />
          Capturar Foto
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default AndroidCameraCapture;
