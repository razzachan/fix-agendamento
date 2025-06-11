
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { deleteServiceOrder } from '@/services/serviceOrder/mutations/deleteServiceOrder';

export const clientDeleteService = {
  async delete(id: string): Promise<boolean> {
    try {
      console.log(`Iniciando exclusão do cliente com ID: ${id}`);
      
      // First check if there are related service orders
      const { data: serviceOrders, error: fetchError } = await supabase
        .from('service_orders')
        .select('id')
        .eq('client_id', id);
      
      if (fetchError) {
        console.error("Erro ao verificar ordens de serviço:", fetchError);
        throw fetchError;
      }
      
      // Se houver ordens de serviço relacionadas, excluir cada uma delas primeiro
      if (serviceOrders && serviceOrders.length > 0) {
        console.log(`Cliente possui ${serviceOrders.length} ordens de serviço vinculadas. Excluindo-as primeiro.`);
        
        for (const order of serviceOrders) {
          console.log(`Excluindo ordem de serviço ${order.id}...`);
          await deleteServiceOrder(order.id);
        }
      }
      
      // Now delete the client after all service orders are gone
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Erro na operação de exclusão:", error);
        throw error;
      }
      
      console.log(`Cliente ${id} excluído com sucesso.`);
      return true;
    } catch (error) {
      console.error(`Erro ao excluir cliente ${id}:`, error);
      toast.error('Erro ao excluir cliente.');
      return false;
    }
  },

  async deleteAll(): Promise<boolean> {
    try {
      // Get all clients
      const { data: clients, error: fetchError } = await supabase
        .from('clients')
        .select('id');

      if (fetchError) {
        throw fetchError;
      }

      // Delete each client
      let deletedCount = 0;
      if (clients && clients.length > 0) {
        for (const client of clients) {
          const success = await this.delete(client.id);
          if (success) deletedCount++;
        }
        
        if (deletedCount > 0) {
          toast.success(`${deletedCount} clientes excluídos com sucesso.`);
        } else {
          toast.info('Não foi possível excluir clientes. Possivelmente possuem ordens de serviço vinculadas.');
        }
      } else {
        toast.info('Nenhum cliente encontrado para excluir.');
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir todos os clientes:', error);
      toast.error('Erro ao excluir clientes.');
      return false;
    }
  },
  
  async deleteByNames(names: string[]): Promise<boolean> {
    try {
      console.log(`Iniciando exclusão de clientes específicos: ${names.join(', ')}`);
      let deletedCount = 0;
      
      for (const name of names) {
        // Find client by exact name, not using ILIKE which can be too broad
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('name', name);
          
        if (clients && clients.length > 0) {
          console.log(`Encontrados ${clients.length} clientes com nome exato: ${name}`);
          
          for (const client of clients) {
            console.log(`Tentando excluir cliente: ${client.name} (${client.id})`);
            const success = await this.delete(client.id);
            if (success) {
              deletedCount++;
              console.log(`Cliente ${client.name} (${client.id}) excluído com sucesso`);
            }
          }
        } else {
          console.log(`Nenhum cliente encontrado com nome exato: ${name}`);
        }
      }
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} clientes excluídos com sucesso.`);
        return true;
      } else {
        toast.info('Nenhum dos clientes especificados foi encontrado ou excluído.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao excluir clientes específicos:', error);
      toast.error('Erro ao excluir clientes específicos.');
      return false;
    }
  }
};
