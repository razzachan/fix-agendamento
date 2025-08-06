
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
      console.log('🚀 [ImageService] Iniciando upload...');
      console.log('📁 [ImageService] Arquivo:', imageFile.name, imageFile.size, 'bytes', imageFile.type);

      // Validate input
      if (!imageFile) {
        console.error('❌ [ImageService] Arquivo de imagem inválido');
        toast.error('Arquivo de imagem inválido.');
        return null;
      }

      // Create a unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${generateUUID()}.${fileExt}`;
      const filePath = `${fileName}`;
      console.log('📝 [ImageService] Nome do arquivo:', fileName);
      console.log('📂 [ImageService] Caminho:', filePath);

      console.log('☁️ [ImageService] Fazendo upload para Supabase...');
      // Upload the file to Supabase storage bucket
      const { data, error } = await supabase
        .storage
        .from('service_order_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('☁️ [ImageService] Resultado do upload:', { data, error });

      if (error) {
        console.error('❌ [ImageService] Erro no upload para Supabase:', error);
        console.error('❌ [ImageService] Detalhes do erro:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ [ImageService] Upload realizado com sucesso:', data);

      console.log('🔗 [ImageService] Obtendo URL pública...');
      // Get the public URL of the file
      const { data: urlData } = supabase
        .storage
        .from('service_order_images')
        .getPublicUrl(filePath);

      console.log('🔗 [ImageService] URL Data:', urlData);

      if (!urlData || !urlData.publicUrl) {
        console.error('❌ [ImageService] Não foi possível obter URL pública');
        throw new Error('Não foi possível obter a URL pública da imagem');
      }

      const result = {
        id: generateUUID(),
        url: urlData.publicUrl,
        name: imageFile.name
      };

      console.log('✅ [ImageService] Upload concluído com sucesso:', result);
      return result;
    } catch (error) {
      console.error('❌ [ImageService] Erro ao fazer upload da imagem:', error);
      console.error('❌ [ImageService] Stack trace:', error instanceof Error ? error.stack : 'No stack');
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
