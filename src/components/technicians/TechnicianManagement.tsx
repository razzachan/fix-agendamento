import React, { useState, useEffect } from 'react';
import { Plus, Trash, Wrench, TableIcon, Grid3x3Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Technician } from '@/types';
import { useNavigate } from 'react-router-dom';
import { technicianService } from '@/services';
import TechniciansTable from './TechniciansTable';
import TechnicianCard from './TechnicianCard';
import DeleteTechnicianDialog from './DeleteTechnicianDialog';
import TechnicianFormDialog from './TechnicianFormDialog';
import TechnicianEditDialog from './TechnicianEditDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TechnicianManagementProps {
  isAdmin: boolean;
}

const TechnicianManagement: React.FC<TechnicianManagementProps> = ({ isAdmin }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [technicianToDelete, setTechnicianToDelete] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [technicianToEdit, setTechnicianToEdit] = useState<Technician | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(isAdmin ? 'table' : 'grid');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    setIsLoading(true);
    try {
      const data = await technicianService.getAll();
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Erro ao carregar os técnicos', {
        description: 'Falha ao carregar os técnicos. Por favor, tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTechnician = async (id: string) => {
    try {
      await technicianService.deleteTechnician(id);
      setTechnicians(technicians.filter(technician => technician.id !== id));
      toast.success('Técnico removido com sucesso!');
    } catch (error) {
      console.error('Error deleting technician:', error);
      toast.error('Falha ao remover o técnico', {
        description: 'Por favor, tente novamente.'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTechnicianToDelete(null);
    }
  };

  const handleEditTechnician = (technician: Technician) => {
    // Sempre usar os dados mais recentes (inclui weight salvo pela tabela)
    const fresh = technicians.find(t=>t.id===technician.id) || technician;
    setTechnicianToEdit(fresh);
    setIsEditDialogOpen(true);
  };

  const handleTechnicianAction = (technicianId: string, action: string) => {
    console.log(`Action ${action} for technician ${technicianId}`);
  };

  return (
    <>
      {isAdmin && (
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setIsFormDialogOpen(true)} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Técnico
          </Button>
          <Button 
            variant="destructive" 
            className="shadow-md"
            onClick={() => navigate('/technicians/purge')}
          >
            <Trash className="h-4 w-4 mr-2" /> Limpeza
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'grid')}>
            <div className="flex justify-end px-4 pt-2">
              <TabsList>
                <TabsTrigger value="table" className="flex items-center">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="grid" className="flex items-center">
                  <Grid3x3Icon className="h-4 w-4 mr-2" />
                  Cards
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="table">
              <TechniciansTable
                technicians={technicians}
                isAdmin={isAdmin}
                onEdit={handleEditTechnician}
                onDelete={id => {
                  setTechnicianToDelete(id);
                  setIsDeleteDialogOpen(true);
                }}
                isLoading={isLoading}
                onUpdateWeight={async (id, weight)=>{
                  try {
                    const t = technicians.find(t=>t.id===id);
                    if (!t) return;
                    await technicianService.updateTechnician({
                      id,
                      name: t.name,
                      email: t.email,
                      phone: t.phone||undefined,
                      specialties: t.specialties||undefined,
                      isActive: (t as any).isActive !== false,
                      groups: (t as any).groups || undefined,
                      weight,
                    });
                    toast.success('Prioridade do técnico atualizada');
                    // Agora que a coluna existe, refetch para sincronizar do banco
                    fetchTechnicians();
                  } catch (e) {
                    console.error('Falha ao atualizar prioridade', e);
                    toast.error('Falha ao atualizar prioridade');
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="grid">
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <Wrench className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : technicians.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-2 text-primary/50" />
                  <p className="text-lg font-medium">Nenhum técnico cadastrado</p>
                  <p className="text-sm">Adicione um novo técnico para começar.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {technicians.map(technician => (
                    <TechnicianCard 
                      key={technician.id} 
                      technician={technician}
                      isAdmin={isAdmin}
                      onEdit={handleEditTechnician}
                      onDelete={id => {
                        setTechnicianToDelete(id);
                        setIsDeleteDialogOpen(true);
                      }}
                      onAction={handleTechnicianAction}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DeleteTechnicianDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => {
          if (technicianToDelete) {
            handleDeleteTechnician(technicianToDelete);
          }
        }}
      />

      <TechnicianFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        selectedTechnician={null}
        onSuccess={() => {
          fetchTechnicians();
          setIsFormDialogOpen(false);
        }}
      />

      <TechnicianEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        technician={technicianToEdit}
        onSuccess={() => {
          fetchTechnicians();
          setIsEditDialogOpen(false);
          setTechnicianToEdit(null);
        }}
      />
    </>
  );
};

export default TechnicianManagement;
