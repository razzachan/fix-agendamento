import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, User, Check } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { technicianQueryService } from '@/services/technician/technicianQueryService';
import { serviceOrderApiService } from '@/services/api/serviceOrderApiService';
import { supabase } from '@/integrations/supabase/client';

interface AssignTechnicianButtonProps {
  order: ServiceOrder;
  onOrderUpdated: (updatedOrder: ServiceOrder) => void;
}

const AssignTechnicianButton: React.FC<AssignTechnicianButtonProps> = ({
  order,
  onOrderUpdated
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(order.technicianId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar técnicos quando o diálogo for aberto
  useEffect(() => {
    if (isDialogOpen) {
      loadTechnicians();
    }
  }, [isDialogOpen]);

  const loadTechnicians = async () => {
    setIsLoading(true);
    try {
      // Usar o technicianQueryService para buscar técnicos diretamente do Supabase
      const technicians = await technicianQueryService.getAll();

      // Filtrar apenas técnicos ativos
      const activeTechnicians = technicians.filter(tech => tech.active !== false);

      // Mapear os técnicos para o formato esperado
      const formattedTechnicians = activeTechnicians.map(tech => ({
        id: tech.id,
        name: tech.name,
        active: tech.active
      }));

      setTechnicians(formattedTechnicians);

      // Se a ordem já tem um técnico atribuído, selecionar ele por padrão
      if (order.technicianId) {
        setSelectedTechnicianId(order.technicianId);
      }

      console.log('Técnicos carregados:', formattedTechnicians);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
      toast.error('Não foi possível carregar a lista de técnicos.');

      // Tentar carregar diretamente do Supabase como fallback
      try {
        const { data, error: supabaseError } = await supabase
          .from('technicians')
          .select('*')
          .eq('active', true);

        if (supabaseError) throw supabaseError;

        if (data && data.length > 0) {
          setTechnicians(data);
          console.log('Técnicos carregados diretamente do Supabase:', data);
        }
      } catch (fallbackError) {
        console.error('Erro no fallback para Supabase:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnicianId) {
      toast.error('Selecione um técnico para atribuir à ordem de serviço.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Encontrar o nome do técnico selecionado
      const selectedTechnician = technicians.find(tech => tech.id === selectedTechnicianId);
      if (!selectedTechnician) {
        throw new Error('Técnico não encontrado');
      }

      // Atualizar diretamente no Supabase (pulando a API que está com problemas)
      console.log('Atualizando técnico diretamente no Supabase para ordem:', order.id);
      console.log('Técnico selecionado:', selectedTechnician);

      const { error: supabaseError } = await supabase
        .from('service_orders')
        .update({
          technician_id: selectedTechnicianId,
          technician_name: selectedTechnician.name
        })
        .eq('id', order.id);

      if (supabaseError) {
        console.error('Erro ao atualizar no Supabase:', supabaseError);
        throw supabaseError;
      }

      console.log('Técnico atribuído com sucesso no Supabase');

      // Atualizar a ordem de serviço no estado local
      onOrderUpdated({
        ...order,
        technicianId: selectedTechnicianId,
        technicianName: selectedTechnician.name
      });

      toast.success(`Técnico ${selectedTechnician.name} atribuído com sucesso à ordem de serviço.`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atribuir técnico:', error);
      toast.error('Não foi possível atribuir o técnico à ordem de serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={order.technicianId ? "outline" : "default"}
          className={order.technicianId ? "border-blue-200 text-blue-600 hover:bg-blue-50" : ""}
          size="sm"
        >
          <Wrench className="h-4 w-4 mr-2" />
          {order.technicianId ? 'Alterar Técnico' : 'Atribuir Técnico'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {order.technicianId ? 'Alterar Técnico' : 'Atribuir Técnico'}
          </DialogTitle>
          <DialogDescription>
            {order.technicianId
              ? 'Selecione outro técnico para atribuir a esta ordem de serviço.'
              : 'Selecione um técnico para atribuir a esta ordem de serviço.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="technician-select" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Selecione um técnico
              </Label>
              <Select
                value={selectedTechnicianId}
                onValueChange={setSelectedTechnicianId}
                disabled={isLoading}
              >
                <SelectTrigger id="technician-select" className="w-full">
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.length === 0 && isLoading && (
                    <SelectItem value="loading" disabled>
                      Carregando técnicos...
                    </SelectItem>
                  )}
                  {technicians.length === 0 && !isLoading && (
                    <SelectItem value="none" disabled>
                      Nenhum técnico disponível
                    </SelectItem>
                  )}
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        {tech.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {order.technicianId && (
              <div className="text-sm text-muted-foreground">
                Técnico atual: <span className="font-medium">{order.technicianName}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssignTechnician}
            disabled={isSubmitting || !selectedTechnicianId}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
                Atribuindo...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTechnicianButton;
