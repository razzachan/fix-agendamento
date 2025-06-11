import { supabase } from '@/integrations/supabase/client';

export interface ServicePhoto {
  id?: string;
  service_order_id: string;
  technician_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  photo_type: 'before' | 'during' | 'after' | 'evidence' | 'document';
  description?: string;
  width?: number;
  height?: number;
  taken_at?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface PhotoUploadOptions {
  serviceOrderId: string;
  technicianId: string;
  photoType: ServicePhoto['photo_type'];
  description?: string;
  includeLocation?: boolean;
}

/**
 * Serviço para gerenciar upload e gestão de fotos dos serviços
 */
export class PhotoService {
  private static readonly STORAGE_BUCKET = 'service-photos';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Validar arquivo de imagem
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Verificar tipo
    if (!PhotoService.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.'
      };
    }

    // Verificar tamanho
    if (file.size > PhotoService.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'Arquivo muito grande. Máximo 10MB.'
      };
    }

    return { isValid: true };
  }

  /**
   * Redimensionar imagem para otimizar upload
   */
  static async resizeImage(
    file: File, 
    maxWidth: number = 1920, 
    maxHeight: number = 1080, 
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Configurar canvas
        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erro ao redimensionar imagem'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Obter dimensões da imagem
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => reject(new Error('Erro ao obter dimensões da imagem'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Gerar nome único para o arquivo
   */
  static generateFileName(originalName: string, serviceOrderId: string, photoType: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = originalName.split('.').pop() || 'jpg';
    return `${serviceOrderId}/${photoType}/${timestamp}.${extension}`;
  }

  /**
   * Upload de foto para o Supabase Storage
   */
  static async uploadPhoto(file: File, options: PhotoUploadOptions): Promise<ServicePhoto> {
    try {
      console.log('🔄 [PhotoService] Iniciando upload de foto...');

      // Validar arquivo
      const validation = PhotoService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Redimensionar imagem se necessário
      const optimizedFile = file.size > 2 * 1024 * 1024 // Se > 2MB
        ? await PhotoService.resizeImage(file)
        : file;

      // Obter dimensões
      const dimensions = await PhotoService.getImageDimensions(file);

      // Gerar nome do arquivo
      const fileName = PhotoService.generateFileName(
        file.name, 
        options.serviceOrderId, 
        options.photoType
      );

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PhotoService.STORAGE_BUCKET)
        .upload(fileName, optimizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ [PhotoService] Erro no upload:', uploadError);
        throw uploadError;
      }

      // Obter localização se solicitado
      let location: { latitude?: number; longitude?: number } = {};
      if (options.includeLocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000
            });
          });
          
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.warn('⚠️ [PhotoService] Não foi possível obter localização:', error);
        }
      }

      // Salvar metadados no banco
      const photoData: Omit<ServicePhoto, 'id'> = {
        service_order_id: options.serviceOrderId,
        technician_id: options.technicianId,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        photo_type: options.photoType,
        description: options.description,
        width: dimensions.width,
        height: dimensions.height,
        taken_at: new Date().toISOString(),
        ...location
      };

      const { data: dbData, error: dbError } = await supabase
        .from('service_photos')
        .insert(photoData)
        .select()
        .single();

      if (dbError) {
        console.error('❌ [PhotoService] Erro ao salvar metadados:', dbError);
        
        // Tentar remover arquivo do storage em caso de erro
        await supabase.storage
          .from(PhotoService.STORAGE_BUCKET)
          .remove([fileName]);
        
        throw dbError;
      }

      console.log('✅ [PhotoService] Foto enviada com sucesso:', dbData);
      return dbData;
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral no upload:', error);
      throw error;
    }
  }

  /**
   * Obter URL pública da foto
   */
  static async getPhotoUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage
      .from(PhotoService.STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Obter fotos de uma ordem de serviço
   */
  static async getServicePhotos(
    serviceOrderId: string, 
    photoType?: ServicePhoto['photo_type']
  ): Promise<ServicePhoto[]> {
    try {
      let query = supabase
        .from('service_photos')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .eq('is_deleted', false)
        .order('taken_at', { ascending: true });

      if (photoType) {
        query = query.eq('photo_type', photoType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [PhotoService] Erro ao buscar fotos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral ao buscar fotos:', error);
      throw error;
    }
  }

  /**
   * Obter fotos de um técnico
   */
  static async getTechnicianPhotos(
    technicianId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ServicePhoto[]> {
    try {
      let query = supabase
        .from('service_photos')
        .select(`
          *,
          service_orders (
            id,
            client_name,
            equipment_type,
            equipment_model
          )
        `)
        .eq('technician_id', technicianId)
        .eq('is_deleted', false)
        .order('taken_at', { ascending: false });

      if (startDate) {
        query = query.gte('taken_at', startDate);
      }

      if (endDate) {
        query = query.lte('taken_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [PhotoService] Erro ao buscar fotos do técnico:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral ao buscar fotos do técnico:', error);
      throw error;
    }
  }

  /**
   * Deletar foto (soft delete)
   */
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_photos')
        .update({ is_deleted: true })
        .eq('id', photoId);

      if (error) {
        console.error('❌ [PhotoService] Erro ao deletar foto:', error);
        throw error;
      }

      console.log('✅ [PhotoService] Foto deletada com sucesso');
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral ao deletar foto:', error);
      throw error;
    }
  }

  /**
   * Atualizar descrição da foto
   */
  static async updatePhotoDescription(photoId: string, description: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('service_photos')
        .update({ description })
        .eq('id', photoId);

      if (error) {
        console.error('❌ [PhotoService] Erro ao atualizar descrição:', error);
        throw error;
      }

      console.log('✅ [PhotoService] Descrição atualizada com sucesso');
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral ao atualizar descrição:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de fotos
   */
  static async getPhotoStats(technicianId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    total: number;
    byType: Record<ServicePhoto['photo_type'], number>;
    totalSize: number;
  }> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data, error } = await supabase
        .from('service_photos')
        .select('photo_type, file_size')
        .eq('technician_id', technicianId)
        .eq('is_deleted', false)
        .gte('taken_at', startDate.toISOString());

      if (error) {
        console.error('❌ [PhotoService] Erro ao buscar estatísticas:', error);
        throw error;
      }

      const stats = {
        total: data.length,
        byType: {
          before: 0,
          during: 0,
          after: 0,
          evidence: 0,
          document: 0
        } as Record<ServicePhoto['photo_type'], number>,
        totalSize: 0
      };

      data.forEach(photo => {
        stats.byType[photo.photo_type]++;
        stats.totalSize += photo.file_size || 0;
      });

      return stats;
    } catch (error) {
      console.error('❌ [PhotoService] Erro geral ao buscar estatísticas:', error);
      throw error;
    }
  }
}
