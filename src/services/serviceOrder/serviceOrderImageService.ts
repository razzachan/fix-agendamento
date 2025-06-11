
import { supabase } from '@/integrations/supabase/client';
import { ServiceOrderImage } from '@/types';
import { toast } from 'sonner';
import { generateUUID } from '@/utils/uuid';

/**
 * Service responsible for handling service order images
 */
export const serviceOrderImageService = {
  /**
   * Upload an image to Supabase storage
   */
  async uploadImage(imageFile: File): Promise<ServiceOrderImage | null> {
    try {
      // Validate input
      if (!imageFile) {
        console.error('Arquivo de imagem inválido');
        toast.error('Arquivo de imagem inválido.');
        return null;
      }

      // Create a unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file to Supabase storage bucket
      const { data, error } = await supabase
        .storage
        .from('service_order_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload para Supabase:', error);
        throw error;
      }

      // Get the public URL of the file
      const { data: urlData } = supabase
        .storage
        .from('service_order_images')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Não foi possível obter a URL pública da imagem');
      }

      return {
        id: generateUUID(),
        url: urlData.publicUrl,
        name: imageFile.name
      };
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao fazer upload da imagem.');
      return null;
    }
  },

  /**
   * Save images associated with a service order
   */
  async saveImages(serviceOrderId: string, images: ServiceOrderImage[]): Promise<boolean> {
    try {
      if (!serviceOrderId) {
        console.error('ID de ordem de serviço inválido');
        return false;
      }
      
      if (!images || images.length === 0) return true;

      const imageRecords = images.map(image => ({
        service_order_id: serviceOrderId,
        url: image.url,
        name: image.name
      }));

      const { error } = await supabase
        .from('service_order_images')
        .insert(imageRecords);

      if (error) {
        console.error('Erro ao inserir imagens no banco:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar imagens da ordem de serviço:', error);
      toast.error('Erro ao salvar imagens da ordem de serviço.');
      return false;
    }
  },
};
