import { useState, useCallback, useRef } from 'react';
import { PhotoService, ServicePhoto, PhotoUploadOptions } from '@/services/photoService';
import { useToast } from '@/hooks/use-toast';

export interface UseServicePhotosReturn {
  // Estados
  isUploading: boolean;
  photos: ServicePhoto[];
  uploadProgress: number;
  
  // Ações
  uploadPhoto: (file: File, options: PhotoUploadOptions) => Promise<ServicePhoto | null>;
  uploadMultiplePhotos: (files: File[], options: Omit<PhotoUploadOptions, 'description'>) => Promise<ServicePhoto[]>;
  deletePhoto: (photoId: string) => Promise<boolean>;
  updateDescription: (photoId: string, description: string) => Promise<boolean>;
  loadPhotos: (serviceOrderId: string, photoType?: ServicePhoto['photo_type']) => Promise<void>;
  
  // Utilitários
  getPhotoUrl: (filePath: string) => Promise<string>;
  validateFile: (file: File) => { isValid: boolean; error?: string };
  formatFileSize: (bytes: number) => string;
  getPhotosByType: (type: ServicePhoto['photo_type']) => ServicePhoto[];
}

/**
 * Hook para gerenciar upload e gestão de fotos dos serviços
 */
export function useServicePhotos(): UseServicePhotosReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  
  // Ref para cancelar uploads se necessário
  const uploadControllerRef = useRef<AbortController | null>(null);

  /**
   * Upload de uma única foto
   */
  const uploadPhoto = useCallback(async (
    file: File, 
    options: PhotoUploadOptions
  ): Promise<ServicePhoto | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Validar arquivo
      const validation = PhotoService.validateFile(file);
      if (!validation.isValid) {
        toast({
          title: "Arquivo inválido",
          description: validation.error,
          variant: "destructive"
        });
        return null;
      }

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Fazer upload
      const uploadedPhoto = await PhotoService.uploadPhoto(file, options);
      
      // Finalizar progresso
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Atualizar lista de fotos
      setPhotos(prev => [uploadedPhoto, ...prev]);

      toast({
        title: "Foto enviada!",
        description: `${file.name} foi enviada com sucesso`,
      });

      return uploadedPhoto;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar foto';
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  /**
   * Upload de múltiplas fotos
   */
  const uploadMultiplePhotos = useCallback(async (
    files: File[], 
    options: Omit<PhotoUploadOptions, 'description'>
  ): Promise<ServicePhoto[]> => {
    const uploadedPhotos: ServicePhoto[] = [];
    
    try {
      setIsUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);

        const photoOptions: PhotoUploadOptions = {
          ...options,
          description: `Foto ${i + 1} de ${files.length}`
        };

        const uploadedPhoto = await PhotoService.uploadPhoto(file, photoOptions);
        if (uploadedPhoto) {
          uploadedPhotos.push(uploadedPhoto);
          setPhotos(prev => [uploadedPhoto, ...prev]);
        }
      }

      toast({
        title: "Upload concluído!",
        description: `${uploadedPhotos.length} de ${files.length} fotos enviadas com sucesso`,
      });

      return uploadedPhotos;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro no upload múltiplo';
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive"
      });
      return uploadedPhotos;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  /**
   * Deletar foto
   */
  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      await PhotoService.deletePhoto(photoId);
      
      // Remover da lista local
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));

      toast({
        title: "Foto removida",
        description: "A foto foi removida com sucesso",
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover foto';
      toast({
        title: "Erro ao remover",
        description: message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  /**
   * Atualizar descrição da foto
   */
  const updateDescription = useCallback(async (
    photoId: string, 
    description: string
  ): Promise<boolean> => {
    try {
      await PhotoService.updatePhotoDescription(photoId, description);
      
      // Atualizar na lista local
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, description }
          : photo
      ));

      toast({
        title: "Descrição atualizada",
        description: "A descrição da foto foi atualizada",
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar descrição';
      toast({
        title: "Erro ao atualizar",
        description: message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  /**
   * Carregar fotos de uma ordem de serviço
   */
  const loadPhotos = useCallback(async (
    serviceOrderId: string, 
    photoType?: ServicePhoto['photo_type']
  ): Promise<void> => {
    try {
      const loadedPhotos = await PhotoService.getServicePhotos(serviceOrderId, photoType);
      setPhotos(loadedPhotos);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      toast({
        title: "Erro ao carregar fotos",
        description: "Não foi possível carregar as fotos da ordem de serviço",
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Obter URL pública da foto
   */
  const getPhotoUrl = useCallback(async (filePath: string): Promise<string> => {
    return await PhotoService.getPhotoUrl(filePath);
  }, []);

  /**
   * Validar arquivo
   */
  const validateFile = useCallback((file: File) => {
    return PhotoService.validateFile(file);
  }, []);

  /**
   * Formatar tamanho do arquivo
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Obter fotos por tipo
   */
  const getPhotosByType = useCallback((type: ServicePhoto['photo_type']): ServicePhoto[] => {
    return photos.filter(photo => photo.photo_type === type);
  }, [photos]);

  return {
    // Estados
    isUploading,
    photos,
    uploadProgress,
    
    // Ações
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    updateDescription,
    loadPhotos,
    
    // Utilitários
    getPhotoUrl,
    validateFile,
    formatFileSize,
    getPhotosByType
  };
}
