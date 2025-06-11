import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, User } from '@/types';
import { workshopService } from '@/services/user/workshopService';

interface WorkshopSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrder: ServiceOrder;
  onConfirm: (workshopId: string, workshopName: string) => void;
  isLoading?: boolean;
}

export const WorkshopSelectionModal: React.FC<WorkshopSelectionModalProps> = ({
  isOpen,
  onClose,
  serviceOrder,
  onConfirm,
  isLoading = false
}) => {
  const [workshops, setWorkshops] = useState<User[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);

  console.log('🎯 [WorkshopSelectionModal] Renderizando modal:', {
    isOpen,
    serviceOrderId: serviceOrder?.id,
    selectedWorkshop: selectedWorkshopId
  });

  // Buscar oficinas quando o modal abrir
  useEffect(() => {
    const fetchWorkshops = async () => {
      if (!isOpen) return;
      
      setLoadingWorkshops(true);
      try {
        console.log('🎯 [WorkshopSelectionModal] Buscando oficinas cadastradas...');
        
        const workshopsData = await workshopService.findAllWorkshops();
        
        console.log('✅ [WorkshopSelectionModal] Oficinas encontradas:', workshopsData.length);
        setWorkshops(workshopsData);
        
        if (workshopsData.length === 0) {
          toast.warning('Nenhuma oficina cadastrada encontrada.');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar oficinas:', error);
        toast.error('Erro ao carregar oficinas cadastradas.');
      } finally {
        setLoadingWorkshops(false);
      }
    };

    fetchWorkshops();
  }, [isOpen]);

  const handleConfirm = () => {
    if (!selectedWorkshopId) {
      toast.error('Selecione uma oficina para continuar.');
      return;
    }

    const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);
    if (!selectedWorkshop) {
      toast.error('Oficina selecionada não encontrada.');
      return;
    }

    console.log('🎯 [WorkshopSelectionModal] Confirmando seleção:', {
      workshopId: selectedWorkshopId,
      workshopName: selectedWorkshop.name
    });

    onConfirm(selectedWorkshopId, selectedWorkshop.name);
  };

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Selecionar Oficina
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Selecione a oficina onde o equipamento ficará para diagnóstico/reparo:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p><strong>Ordem:</strong> #{serviceOrder?.id}</p>
              <p><strong>Cliente:</strong> {serviceOrder?.clientName}</p>
              <p><strong>Equipamento:</strong> {serviceOrder?.equipmentType} {serviceOrder?.equipmentModel}</p>
              <p><strong>Status atual:</strong> Coletado para Diagnóstico</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loadingWorkshops ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-muted-foreground">Carregando oficinas...</span>
            </div>
          ) : workshops.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Nenhuma oficina cadastrada encontrada
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="workshop-select">Oficina *</Label>
                <Select value={selectedWorkshopId} onValueChange={setSelectedWorkshopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma oficina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map((workshop) => (
                      <SelectItem key={workshop.id} value={workshop.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{workshop.name}</span>
                          {workshop.city && (
                            <span className="text-muted-foreground">- {workshop.city}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Detalhes da oficina selecionada */}
              {selectedWorkshop && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {selectedWorkshop.name}
                  </h4>
                  
                  {selectedWorkshop.address && (
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedWorkshop.address}
                      {selectedWorkshop.city && `, ${selectedWorkshop.city}`}
                      {selectedWorkshop.state && ` - ${selectedWorkshop.state}`}
                    </p>
                  )}
                  
                  {selectedWorkshop.phone && (
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedWorkshop.phone}
                    </p>
                  )}
                  
                  {selectedWorkshop.email && (
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedWorkshop.email}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedWorkshopId || isLoading || loadingWorkshops}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Processando...' : 'Confirmar e Avançar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
