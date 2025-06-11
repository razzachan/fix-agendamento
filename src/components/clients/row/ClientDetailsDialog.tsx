
import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { clientService } from '@/services';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ClientRowView from './ClientRowView';
import ClientRowEdit from './ClientRowEdit';
import { useClientEditForm } from '@/hooks/useClientEditForm';

interface ClientDetailsDialogProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

const ClientDetailsDialog: React.FC<ClientDetailsDialogProps> = ({
  client,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsClient, setDetailsClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Função customizada para fechar o diálogo e notificar o componente pai
  const handleDialogClose = () => {
    setIsEditing(false);
    onClose();
  };
  
  // Use o hook useClientEditForm para lidar com a edição
  const { isSaving, handleSave } = useClientEditForm({
    onSaved: (updatedClient) => {
      console.log("Cliente atualizado com sucesso no diálogo:", updatedClient);
      setDetailsClient(updatedClient);
      setIsEditing(false);
      
      // Pequeno atraso para garantir que a UI seja atualizada antes de fechar
      setTimeout(() => {
        handleDialogClose();
      }, 500);
    },
    onClose: () => setIsEditing(false)
  });

  // Load client details when dialog opens
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (isOpen && client) {
        try {
          setLoading(true);
          setError(null);
          
          console.log(`Buscando cliente com ID: ${client.id}`);
          const clientData = await clientService.getById(client.id);
          
          if (clientData) {
            setDetailsClient(clientData);
            console.log("Cliente encontrado no banco de dados:", clientData);
          } else {
            setError("Cliente não encontrado no banco de dados");
            console.log("Cliente não encontrado, usando dados da listagem");
            setDetailsClient(client);
          }
        } catch (error) {
          console.error("Error loading client details:", error);
          setError("Erro ao carregar detalhes do cliente");
          setDetailsClient(client);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchClientDetails();
  }, [isOpen, client]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async (data: Client) => {
    if (!detailsClient?.id) {
      toast.error("ID do cliente não encontrado");
      return;
    }
    
    console.log("Salvando alterações do cliente:", data);
    await handleSave(detailsClient.id, data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            {loading ? "Carregando..." : detailsClient?.name || client.name}
          </DialogTitle>
          {error && (
            <DialogDescription className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              {error} - Exibindo dados da listagem
            </DialogDescription>
          )}
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isEditing ? (
          <ClientRowEdit 
            client={detailsClient || client}
            onSave={handleSaveChanges}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
          />
        ) : (
          <ClientRowView 
            client={detailsClient || client} 
            onEditClick={handleEditClick} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsDialog;
