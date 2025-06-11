
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Client } from '@/types';
import { clientService } from '@/services';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { 
  ClientInfoCard, 
  ClientEditForm, 
  ClientDetailsHeader,
  LoadingState,
  ClientNotFound
} from '@/components/clients/details';
import { useClientEditForm } from '@/hooks/useClientEditForm';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const { isSaving, handleSave } = useClientEditForm({
    onSaved: (updatedClient) => {
      setClient(updatedClient);
      setIsEditing(false);
      toast.success("Cliente atualizado com sucesso");
    },
    onClose: () => setIsEditing(false)
  });

  useEffect(() => {
    const loadClient = async () => {
      try {
        setLoading(true);
        if (!id) return;
        
        const clientData = await clientService.getById(id);
        
        if (clientData) {
          setClient(clientData);
        } else {
          toast.error("Cliente não encontrado");
        }
      } catch (error) {
        console.error("Error loading client details:", error);
        toast.error("Erro ao carregar detalhes do cliente");
      } finally {
        setLoading(false);
      }
    };
    
    loadClient();
  }, [id]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async (data: Client) => {
    if (!id) {
      toast.error("ID do cliente não encontrado");
      return;
    }
    
    await handleSave(id, data);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!client) {
    return <ClientNotFound />;
  }

  return (
    <div className="space-y-6">
      <ClientDetailsHeader title="Detalhes do Cliente" />

      {isEditing ? (
        <ClientEditForm 
          client={client} 
          onSave={handleSaveChanges} 
          onCancel={handleCancelEdit} 
          isSaving={isSaving} 
        />
      ) : (
        <>
          <ClientInfoCard client={client} />
          <Card>
            <CardFooter className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleEditClick}
                className="flex items-center gap-1"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClientDetails;
