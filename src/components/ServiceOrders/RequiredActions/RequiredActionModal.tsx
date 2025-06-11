import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, AlertTriangle, CheckCircle, Image } from 'lucide-react';
import { toast } from 'sonner';
import { StatusTransitionConfig, RequiredAction, ActionData, CompletedAction } from '@/types/requiredActions';
import { ServiceOrderImage } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface RequiredActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StatusTransitionConfig;
  onComplete: (actions: CompletedAction[], skipped: boolean, skipReason?: string) => void;
  isLoading?: boolean;
  serviceOrderId: string;
}

export const RequiredActionModal: React.FC<RequiredActionModalProps> = ({
  isOpen,
  onClose,
  config,
  onComplete,
  isLoading = false,
  serviceOrderId
}) => {
  console.log('🎯 [RequiredActionModal] Renderizando modal:', { isOpen, config: config?.title });

  const [actionData, setActionData] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<Record<string, File[]>>({});
  const [existingImages, setExistingImages] = useState<ServiceOrderImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  // Buscar fotos existentes quando o modal abrir
  useEffect(() => {
    const fetchExistingImages = async () => {
      if (!isOpen || !serviceOrderId) return;

      setLoadingImages(true);
      try {
        console.log('🎯 [RequiredActionModal] Buscando fotos existentes para ordem:', serviceOrderId);

        const { data, error } = await supabase
          .from('service_order_images')
          .select('*')
          .eq('service_order_id', serviceOrderId);

        if (error) {
          console.error('❌ Erro ao buscar fotos existentes:', error);
          return;
        }

        const images = data?.map(img => ({
          id: img.id,
          url: img.url,
          name: img.name
        })) || [];

        console.log('✅ [RequiredActionModal] Fotos existentes encontradas:', images.length);
        setExistingImages(images);
      } catch (error) {
        console.error('❌ Erro ao buscar fotos existentes:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchExistingImages();
  }, [isOpen, serviceOrderId]);

  const handlePhotoUpload = (actionIndex: number, files: FileList | null) => {
    if (!files) return;
    
    const action = config.requiredActions[actionIndex];
    const maxPhotos = action.maxPhotos || 1;
    const selectedFiles = Array.from(files).slice(0, maxPhotos);
    
    setPhotos(prev => ({
      ...prev,
      [actionIndex]: selectedFiles
    }));
  };

  const handleInputChange = (actionIndex: number, value: any) => {
    setActionData(prev => ({
      ...prev,
      [actionIndex]: value
    }));
  };

  const validateActions = (): boolean => {
    for (let i = 0; i < config.requiredActions.length; i++) {
      const action = config.requiredActions[i];
      
      if (!action.required) continue;
      
      if (action.type === 'photo') {
        const actionPhotos = photos[i] || [];
        const hasExistingImages = existingImages.length > 0;

        // Se não há fotos novas E não há fotos existentes, é obrigatório
        if (actionPhotos.length === 0 && !hasExistingImages) {
          toast.error(`${action.label} é obrigatório`);
          return false;
        }
      } else {
        const value = actionData[i];
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          toast.error(`${action.label} é obrigatório`);
          return false;
        }
        
        // Validação customizada
        if (action.validation && !action.validation(value)) {
          toast.error(`${action.label} não atende aos critérios necessários`);
          return false;
        }
        
        // Validação de tamanho mínimo para texto
        if (action.type === 'text' && action.minLength && value.length < action.minLength) {
          toast.error(`${action.label} deve ter pelo menos ${action.minLength} caracteres`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleComplete = () => {
    if (!validateActions()) return;
    
    const completedActions: CompletedAction[] = config.requiredActions.map((action, index) => {
      let value: any;
      
      if (action.type === 'photo') {
        value = photos[index] || [];
      } else {
        value = actionData[index];
      }
      
      return {
        actionType: action.type,
        data: {
          type: action.type,
          value,
          timestamp: new Date().toISOString(),
          technicianId: '', // Será preenchido pelo componente pai
          metadata: {
            label: action.label,
            fromStatus: config.fromStatus,
            toStatus: config.toStatus
          }
        },
        skipped: false
      };
    });
    
    onComplete(completedActions, false);
  };

  const handleSkip = () => {
    if (!config.allowSkip) return;
    
    if (!skipReason.trim()) {
      toast.error('Por favor, informe o motivo para pular as ações obrigatórias');
      return;
    }
    
    onComplete([], true, skipReason);
  };

  const renderActionInput = (action: RequiredAction, index: number) => {
    switch (action.type) {
      case 'photo':
        const hasExistingImages = existingImages.length > 0;
        const currentPhotos = photos[index] || [];
        const totalPhotos = hasExistingImages ? existingImages.length + currentPhotos.length : currentPhotos.length;

        return (
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {action.label}
              {action.required && !hasExistingImages && <span className="text-red-500">*</span>}
              {hasExistingImages && <span className="text-green-600">(Opcional - já possui fotos)</span>}
            </Label>

            {/* Mostrar fotos existentes */}
            {loadingImages && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Carregando fotos existentes...
              </div>
            )}

            {hasExistingImages && !loadingImages && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Image className="w-4 h-4" />
                  <span className="font-medium">{existingImages.length} foto(s) já salva(s):</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border border-green-200">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2 text-xs text-white truncate">
                        {image.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input para novas fotos */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {hasExistingImages ? 'Adicionar mais fotos (opcional):' : 'Selecionar fotos:'}
              </Label>
              <Input
                type="file"
                accept="image/*"
                multiple={action.maxPhotos && action.maxPhotos > 1}
                onChange={(e) => handlePhotoUpload(index, e.target.files)}
                className="cursor-pointer"
              />
            </div>

            {action.maxPhotos && action.maxPhotos > 1 && (
              <p className="text-sm text-muted-foreground">
                Máximo {action.maxPhotos} fotos {hasExistingImages ? `(${existingImages.length} já salvas)` : ''}
              </p>
            )}

            {currentPhotos.length > 0 && (
              <p className="text-sm text-blue-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {currentPhotos.length} nova(s) foto(s) selecionada(s)
              </p>
            )}

            {totalPhotos > 0 && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Total: {totalPhotos} foto(s)
              </p>
            )}
          </div>
        );
        
      case 'text':
        return (
          <div className="space-y-2">
            <Label>
              {action.label}
              {action.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              value={actionData[index] || ''}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder={action.placeholder}
              className="min-h-[80px]"
            />
            {action.minLength && (
              <p className="text-sm text-muted-foreground">
                Mínimo {action.minLength} caracteres
              </p>
            )}
          </div>
        );
        
      case 'selection':
        return (
          <div className="space-y-2">
            <Label>
              {action.label}
              {action.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={actionData[index] || ''}
              onValueChange={(value) => handleInputChange(index, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                {action.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      default:
        return (
          <div className="space-y-2">
            <Label>
              {action.label}
              {action.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              value={actionData[index] || ''}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder={action.placeholder}
            />
          </div>
        );
    }
  };

  if (showSkipConfirm) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pular Ações Obrigatórias
            </DialogTitle>
            <DialogDescription>
              {config.skipReason}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Motivo para pular as ações obrigatórias *</Label>
              <Textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Explique o motivo (ex: cliente ausente, equipamento muito grande, etc.)"
                className="min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSkipConfirm(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSkip}
              disabled={!skipReason.trim()}
            >
              Confirmar e Pular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {config.requiredActions.map((action, index) => (
            <div key={index}>
              {renderActionInput(action, index)}
            </div>
          ))}
        </div>
        
        <DialogFooter className="gap-2">
          {config.allowSkip && (
            <Button 
              variant="outline" 
              onClick={() => setShowSkipConfirm(true)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              Pular (Adversidade)
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={isLoading}>
            {isLoading ? 'Processando...' : 'Confirmar e Avançar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
