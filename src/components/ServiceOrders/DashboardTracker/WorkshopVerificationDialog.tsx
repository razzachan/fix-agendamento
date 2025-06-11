
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { workshopService } from '@/services/user/workshopService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkshopVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (workshopId: string) => void;
}

const WorkshopVerificationDialog: React.FC<WorkshopVerificationDialogProps> = ({
  open,
  onOpenChange,
  onVerify,
}) => {
  const [workshops, setWorkshops] = useState<User[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWorkshops = async () => {
      try {
        const workshopsList = await workshopService.findAllWorkshops();
        setWorkshops(workshopsList);
      } catch (error) {
        console.error('Error loading workshops:', error);
        toast.error('Erro ao carregar lista de oficinas');
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      loadWorkshops();
    }
  }, [open]);

  const handleVerify = () => {
    if (!selectedWorkshop) {
      toast.error('Selecione uma oficina');
      return;
    }
    onVerify(selectedWorkshop);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verificar Oficina Responsável</DialogTitle>
          <DialogDescription>
            Selecione a oficina que ficará responsável pelo equipamento
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            value={selectedWorkshop}
            onValueChange={setSelectedWorkshop}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma oficina" />
            </SelectTrigger>
            <SelectContent>
              {workshops.map((workshop) => (
                <SelectItem key={workshop.id} value={workshop.id}>
                  {workshop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleVerify} disabled={!selectedWorkshop || isLoading}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkshopVerificationDialog;
