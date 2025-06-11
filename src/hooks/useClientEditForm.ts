
import { useState } from 'react';
import { clientService } from '@/services';
import { Client } from '@/types';
import { toast } from 'sonner';

interface UseClientEditFormProps {
  onSaved: (client: Client) => void;
  onClose: () => void;
}

export const useClientEditForm = ({ onSaved, onClose }: UseClientEditFormProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (clientId: string, data: Partial<Client>) => {
    if (!clientId) {
      toast.error("ID do cliente não encontrado");
      return;
    }

    try {
      setIsSaving(true);
      console.log(`Iniciando atualização do cliente ${clientId}:`, data);
      
      const updatedClient = await clientService.update(clientId, data);
      
      if (updatedClient) {
        console.log("Cliente atualizado com sucesso:", updatedClient);
        toast.success("Cliente atualizado com sucesso");
        
        // Chamada direta de onSaved com o cliente atualizado
        onSaved(updatedClient);
        
        // Pequeno atraso para garantir que a UI seja atualizada corretamente
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        // Isso não deveria acontecer devido à validação no serviço
        toast.error("Erro ao atualizar cliente: resposta inválida");
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          toast.error(`Cliente não encontrado no banco de dados. Tente atualizar a lista de clientes.`);
        } else {
          toast.error(error.message || "Erro ao salvar alterações do cliente");
        }
      } else {
        toast.error("Erro ao salvar alterações do cliente");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSave
  };
};
