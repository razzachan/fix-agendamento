import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { workshopService, Workshop } from '@/services/workshop/workshopService';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';

interface WorkshopSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrderId: string;
  currentWorkshopId?: string | null;
  currentWorkshopName?: string | null;
  onSuccess?: () => void;
}

export const WorkshopSelector: React.FC<WorkshopSelectorProps> = ({
  open,
  onOpenChange,
  serviceOrderId,
  currentWorkshopId,
  currentWorkshopName,
  onSuccess
}) => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(currentWorkshopId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Carregar oficinas disponíveis
  useEffect(() => {
    if (open) {
      loadWorkshops();
    }
  }, [open]);

  const loadWorkshops = async () => {
    setIsLoading(true);
    try {
      const workshopList = await workshopService.getAllWorkshops();
      setWorkshops(workshopList);
    } catch (error) {
      console.error('Erro ao carregar oficinas:', error);
      toast.error('Erro ao carregar lista de oficinas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedWorkshopId) {
      toast.error('Selecione uma oficina');
      return;
    }

    setIsAssigning(true);
    try {
      const success = await workshopService.assignOrderToWorkshop(serviceOrderId, selectedWorkshopId);
      
      if (success) {
        const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);
        toast.success(`Equipamento associado à oficina: ${selectedWorkshop?.name}`);
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error('Erro ao associar equipamento à oficina');
      }
    } catch (error) {
      console.error('Erro ao associar oficina:', error);
      toast.error('Erro ao associar equipamento à oficina');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setIsAssigning(true);
    try {
      const success = await workshopService.unassignOrderFromWorkshop(serviceOrderId);
      
      if (success) {
        toast.success('Associação com oficina removida');
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error('Erro ao remover associação');
      }
    } catch (error) {
      console.error('Erro ao remover associação:', error);
      toast.error('Erro ao remover associação');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gerenciar Oficina
          </DialogTitle>
          <DialogDescription>
            Associe este equipamento a uma oficina específica para melhor controle e rastreamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Oficina Atual */}
          {currentWorkshopName && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Oficina Atual:</p>
              <p className="text-sm text-blue-700">{currentWorkshopName}</p>
            </div>
          )}

          {/* Seletor de Oficina */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecionar Oficina:</label>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm">Carregando oficinas...</span>
              </div>
            ) : (
              <Select value={selectedWorkshopId} onValueChange={setSelectedWorkshopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma oficina" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem key={workshop.id} value={workshop.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{workshop.name}</span>
                        <span className="text-xs text-muted-foreground">{workshop.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Informações da Oficina Selecionada */}
          {selectedWorkshopId && (
            <div className="p-3 bg-green-50 rounded-lg">
              {(() => {
                const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);
                return selectedWorkshop ? (
                  <div>
                    <p className="text-sm font-medium text-green-900">{selectedWorkshop.name}</p>
                    <p className="text-xs text-green-700">{selectedWorkshop.email}</p>
                    {selectedWorkshop.phone && (
                      <p className="text-xs text-green-700">📞 {selectedWorkshop.phone}</p>
                    )}
                    {selectedWorkshop.city && selectedWorkshop.state && (
                      <p className="text-xs text-green-700">📍 {selectedWorkshop.city}, {selectedWorkshop.state}</p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {/* Botão para remover associação */}
          {currentWorkshopId && (
            <Button
              variant="outline"
              onClick={handleUnassign}
              disabled={isAssigning}
              className="text-red-600 hover:text-red-700"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removendo...
                </>
              ) : (
                'Remover Associação'
              )}
            </Button>
          )}

          {/* Botão para cancelar */}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          {/* Botão para associar */}
          <Button
            onClick={handleAssign}
            disabled={!selectedWorkshopId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Associando...
              </>
            ) : (
              currentWorkshopId ? 'Alterar Oficina' : 'Associar Oficina'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
