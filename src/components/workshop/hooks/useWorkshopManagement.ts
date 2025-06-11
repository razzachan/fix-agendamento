
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User } from '@/types';
import { userService } from '@/services';

export function useWorkshopManagement() {
  const [workshops, setWorkshops] = useState<User[]>([]);
  const [isWorkshopFormDialogOpen, setIsWorkshopFormDialogOpen] = useState(false);
  const [isWorkshopEditDialogOpen, setIsWorkshopEditDialogOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      setIsLoading(true);
      const workshopUsers = await userService.findAllWorkshops();
      setWorkshops(workshopUsers);
      
      if (workshopUsers.length === 0) {
        console.log('Nenhuma oficina encontrada no banco de dados');
      }
    } catch (error) {
      console.error('Error fetching workshops:', error);
      toast.error('Erro ao carregar oficinas', {
        description: 'Falha ao carregar as oficinas. Por favor, tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWorkshop = (workshop: User) => {
    setSelectedWorkshop(workshop);
    setIsWorkshopEditDialogOpen(true);
  };

  const handleDeleteWorkshop = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const success = await userService.deleteUser(id);
      
      if (success) {
        setWorkshops(prevWorkshops => prevWorkshops.filter(workshop => workshop.id !== id));
        return true;
      } else {
        toast.error('Erro ao excluir oficina', {
          description: 'Falha ao excluir a oficina do banco de dados. Por favor, tente novamente.'
        });
        return false;
      }
    } catch (error) {
      console.error('Error deleting workshop:', error);
      toast.error('Erro ao excluir oficina', {
        description: 'Ocorreu um erro ao tentar excluir a oficina. Tente novamente.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = () => {
    toast.success('Oficina adicionada', {
      description: 'A oficina foi cadastrada com sucesso!',
    });
    setIsWorkshopFormDialogOpen(false);
    fetchWorkshops();
  };

  const handleEditSuccess = () => {
    setIsWorkshopEditDialogOpen(false);
    setSelectedWorkshop(null);
    fetchWorkshops();
  };

  return {
    workshops,
    isLoading,
    isWorkshopFormDialogOpen,
    setIsWorkshopFormDialogOpen,
    isWorkshopEditDialogOpen,
    setIsWorkshopEditDialogOpen,
    selectedWorkshop,
    handleEditWorkshop,
    handleDeleteWorkshop,
    handleAddSuccess,
    handleEditSuccess,
    refreshWorkshops: fetchWorkshops
  };
}
