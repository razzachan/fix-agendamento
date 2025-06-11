
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { userService } from '@/services';

/**
 * Service for bulk operations on technicians
 */
export const technicianBulkService = {
  async deleteAllExcept(nameToKeep: string): Promise<{ deleted: number, errors: number }> {
    try {
      console.log(`Buscando todos os técnicos exceto "${nameToKeep}"...`);
      
      // Get all technicians
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .neq('name', nameToKeep);
        
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('Nenhum técnico para excluir.');
        return { deleted: 0, errors: 0 };
      }
      
      console.log(`Encontrados ${data.length} técnicos para excluir.`);
      
      let deletedCount = 0;
      let errorCount = 0;
      
      // Delete each technician one by one
      for (const tech of data) {
        try {
          console.log(`Excluindo técnico: ${tech.name} (ID: ${tech.id})...`);
          
          // Delete the technician
          const { error: deleteError } = await supabase
            .from('technicians')
            .delete()
            .eq('id', tech.id);
            
          if (deleteError) {
            console.error(`Erro ao excluir técnico ${tech.name}:`, deleteError);
            errorCount++;
            continue;
          }
          
          // If there's an associated user, delete it too
          if (tech.user_id) {
            try {
              await userService.deleteUser(tech.user_id);
              console.log(`Usuário associado ao técnico ${tech.name} excluído com sucesso.`);
            } catch (userError) {
              console.error(`Erro ao excluir usuário do técnico ${tech.name}:`, userError);
            }
          }
          
          deletedCount++;
          console.log(`Técnico ${tech.name} excluído com sucesso.`);
        } catch (techError) {
          console.error(`Erro ao processar exclusão do técnico ${tech.name}:`, techError);
          errorCount++;
        }
      }
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} técnicos foram excluídos com sucesso.`);
      }
      
      if (errorCount > 0) {
        toast.error(`Houve problemas ao excluir ${errorCount} técnicos.`);
      }
      
      return { deleted: deletedCount, errors: errorCount };
    } catch (error) {
      console.error('Erro ao excluir técnicos:', error);
      toast.error('Erro ao excluir técnicos do banco de dados.');
      return { deleted: 0, errors: 1 };
    }
  }
};
