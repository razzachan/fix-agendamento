import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import { generateUUID } from '@/utils/uuid';

interface SimpleNewOrderDialogProps {
  onCreateOrder?: (data: Partial<ServiceOrder>) => Promise<ServiceOrder | null>;
  refreshServiceOrders?: () => Promise<void>;
}

const SimpleNewOrderDialog: React.FC<SimpleNewOrderDialogProps> = ({
  onCreateOrder,
  refreshServiceOrders
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados do formulário simples
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [problem, setProblem] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !equipmentType || !problem) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceOrder: Partial<ServiceOrder> = {
        // id: removido - deixar o banco gerar o ID fixo
        clientName,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        equipmentType,
        description: problem,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        technicianId: null,
        technicianName: null,
        scheduledDate: null,
        completedDate: null,
        equipmentModel: null,
        equipmentSerial: null,
        needsPickup: false,
        pickupAddress: null,
        currentLocation: 'workshop',
        serviceAttendanceType: 'em_domicilio',
        clientDescription: problem
      };

      if (onCreateOrder) {
        const result = await onCreateOrder(serviceOrder);
        if (result) {
          toast.success('Ordem criada com sucesso!');
          setIsOpen(false);
          resetForm();
          if (refreshServiceOrders) {
            await refreshServiceOrders();
          }
        } else {
          toast.error('Erro ao criar ordem');
        }
      }
    } catch (error) {
      console.error('Erro ao criar ordem:', error);
      toast.error('Erro ao criar ordem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setEquipmentType('');
    setProblem('');
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetForm();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="shadow-md">
        <Plus className="h-4 w-4 mr-2" /> Nova Ordem
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                type="tel"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
              />
            </div>

            <div>
              <Label htmlFor="equipmentType">Tipo de Equipamento *</Label>
              <Input
                id="equipmentType"
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                placeholder="Ex: Micro-ondas, Geladeira, Fogão"
                required
              />
            </div>

            <div>
              <Label htmlFor="problem">Descrição do Problema *</Label>
              <textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Descreva o problema do equipamento"
                className="w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Criar Ordem'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleNewOrderDialog;
