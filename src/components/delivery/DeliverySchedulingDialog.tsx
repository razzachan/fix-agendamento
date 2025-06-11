import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, MapPin, Package, CheckCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceOrder {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  pickup_address: string;
  client_phone: string;
  service_attendance_type: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface DeliverySchedulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrder | null;
  onScheduleSuccess: () => void;
}

export function DeliverySchedulingDialog({
  open,
  onOpenChange,
  serviceOrder,
  onScheduleSuccess
}: DeliverySchedulingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    technician_id: '',
    delivery_address: '',
    delivery_notes: ''
  });

  useEffect(() => {
    if (open) {
      loadTechnicians();
    }
  }, [open]);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('id, name, email');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar técnicos:', error);
      toast.error('Erro ao carregar lista de técnicos.');
    }
  };

  const handleScheduleDelivery = async () => {
    if (!serviceOrder) return;

    // Validações
    if (!formData.scheduled_date || !formData.scheduled_time || !formData.technician_id) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      // Formatar a data e hora para o formato esperado pelo backend (igual ao RoutedAppointmentsManager)
      const fullDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00`;

      // 1. Criar agendamento de entrega vinculado à OS
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_services')
        .insert({
          service_order_id: serviceOrder.id,
          technician_id: formData.technician_id,
          client_name: serviceOrder.client_name,
          service_type: 'delivery',
          equipment_type: serviceOrder.equipment_type,
          equipment_model: serviceOrder.equipment_model,
          scheduled_start_time: fullDateTime,
          scheduled_end_time: new Date(new Date(fullDateTime).getTime() + 60 * 60 * 1000).toISOString(), // +1 hora
          address: formData.delivery_address || serviceOrder.pickup_address,
          description: `Entrega de ${serviceOrder.equipment_type} - ${serviceOrder.client_name}`,
          notes: formData.delivery_notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // 2. Atualizar status da ordem de serviço para delivery_scheduled
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'delivery_scheduled',
          assigned_technician_id: formData.technician_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceOrder.id);

      if (updateError) throw updateError;

      // 3. Registrar evento na timeline
      const { error: eventError } = await supabase
        .from('service_events')
        .insert({
          service_order_id: serviceOrder.id,
          type: 'delivery_scheduled',
          description: JSON.stringify({
            scheduled_date: fullDateTime,
            technician_name: technicians.find(t => t.id === formData.technician_id)?.name || 'Técnico',
            delivery_address: formData.delivery_address || serviceOrder.pickup_address,
            notes: formData.delivery_notes,
            scheduled_by: 'admin'
          })
        });

      if (eventError) throw eventError;

      toast.success('Entrega agendada com sucesso!');
      onScheduleSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        scheduled_date: '',
        scheduled_time: '',
        technician_id: '',
        delivery_address: '',
        delivery_notes: ''
      });

    } catch (error) {
      console.error('❌ Erro ao agendar entrega:', error);
      toast.error('Erro ao agendar entrega. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!serviceOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agendar Entrega - {serviceOrder.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do equipamento */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipamento para Entrega
            </h4>
            <p className="text-sm text-gray-700">
              <strong>{serviceOrder.equipment_type}</strong>
              {serviceOrder.equipment_model && ` - ${serviceOrder.equipment_model}`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cliente: {serviceOrder.client_name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data do agendamento */}
            <div className="space-y-2">
              <Label htmlFor="scheduled_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data da Entrega *
              </Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Horário */}
            <div className="space-y-2">
              <Label htmlFor="scheduled_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário *
              </Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Técnico */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Técnico Responsável *
            </Label>
            <Select
              value={formData.technician_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, technician_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Endereço de entrega */}
          <div className="space-y-2">
            <Label htmlFor="delivery_address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço de Entrega
            </Label>
            <Textarea
              id="delivery_address"
              value={formData.delivery_address}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
              placeholder={`Endereço padrão: ${serviceOrder.pickup_address}`}
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Deixe em branco para usar o endereço de coleta: {serviceOrder.pickup_address}
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="delivery_notes">Observações da Entrega</Label>
            <Textarea
              id="delivery_notes"
              value={formData.delivery_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
              placeholder="Instruções especiais, horário preferencial, etc..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleDelivery}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Agendar Entrega
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
