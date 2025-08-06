import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, User, MapPin, Package, CheckCircle, Info, Home, MapPinIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TechnicianTimeSlots from '@/components/schedules/TechnicianTimeSlots';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
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
    delivery_notes: '',
    address_option: 'pickup' // 'pickup', 'custom', 'client'
  });
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (open) {
      loadTechnicians();
    }
  }, [open]);

  // Funções para controle do calendário
  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  // Lidar com mudança de opção de endereço
  const handleAddressOptionChange = (option: string) => {
    setFormData(prev => ({
      ...prev,
      address_option: option,
      delivery_address: option === 'pickup' ? '' : prev.delivery_address
    }));
  };

  const handleTimeSlotSelect = (date: string, time: string) => {
    console.log(`🔍 [DeliverySchedulingDialog] Horário selecionado:`, {
      date,
      time,
      serviceOrderId: serviceOrder?.id,
      clientName: serviceOrder?.client_name
    });

    setFormData(prev => ({
      ...prev,
      scheduled_date: date,
      scheduled_time: time
    }));
  };

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
    console.log(`🚀 [DeliverySchedulingDialog] Iniciando agendamento de entrega:`, {
      serviceOrderId: serviceOrder?.id,
      clientName: serviceOrder?.client_name,
      scheduledDate: formData.scheduled_date,
      scheduledTime: formData.scheduled_time,
      technicianId: formData.technician_id,
      timestamp: new Date().toISOString()
    });

    if (!serviceOrder) return;

    // Proteção contra múltiplos cliques
    if (isLoading) {
      console.log(`⚠️ [DeliverySchedulingDialog] Já está processando, ignorando clique duplo`);
      return;
    }

    // Validações
    if (!formData.scheduled_date || !formData.scheduled_time || !formData.technician_id) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    // Validação específica para endereço personalizado
    if (formData.address_option === 'custom' && !formData.delivery_address.trim()) {
      toast.error('Digite o endereço personalizado para entrega.');
      return;
    }

    setIsLoading(true);
    try {
      // 🔧 CORREÇÃO: Construir datetime em UTC para evitar problemas de timezone
      const fullDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00.000Z`;

      console.log(`🔍 [DeliverySchedulingDialog] Construção do horário (CORRIGIDO):`, {
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        fullDateTime,
        fullDateTimeParsed: new Date(fullDateTime).toISOString(),
        endTimeCalculated: new Date(new Date(fullDateTime).getTime() + 60 * 60 * 1000).toISOString()
      });

      // Determinar endereço de entrega baseado na opção selecionada
      let deliveryAddress = '';
      switch (formData.address_option) {
        case 'pickup':
          deliveryAddress = serviceOrder.pickup_address;
          break;
        case 'client':
          deliveryAddress = (serviceOrder as any).client_address || serviceOrder.pickup_address;
          break;
        case 'custom':
          deliveryAddress = formData.delivery_address;
          break;
        default:
          deliveryAddress = serviceOrder.pickup_address;
      }

      // Validação final do endereço
      if (!deliveryAddress || deliveryAddress.trim() === '') {
        toast.error('Endereço de entrega não pode estar vazio.');
        return;
      }

      // Buscar nome do técnico selecionado
      const selectedTechnician = technicians.find(t => t.id === formData.technician_id);
      const technicianName = selectedTechnician?.name || 'Técnico';

      console.log('🔧 Dados para inserção:', {
        service_order_id: serviceOrder.id,
        technician_id: formData.technician_id,
        technician_name: technicianName,
        client_id: (serviceOrder as any).client_id,
        client_name: serviceOrder.client_name,
        equipment_type: serviceOrder.equipment_type,
        start_time: fullDateTime,
        address: deliveryAddress,
        address_option: formData.address_option,
        pickup_address: serviceOrder.pickup_address,
        client_address: (serviceOrder as any).client_address
      });

      // 🎯 VERIFICAR SE JÁ EXISTE EVENTO PARA ESTA OS
      const { data: existingEvents, error: checkError } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('service_order_id', serviceOrder.id)
        .not('status', 'eq', 'cancelled');

      if (checkError) throw checkError;

      if (existingEvents && existingEvents.length > 0) {
        console.log(`⚠️ [DeliverySchedulingDialog] Já existe evento para OS ${serviceOrder.id}, atualizando ao invés de criar novo`);

        // Atualizar evento existente ao invés de criar novo
        const { error: scheduleError } = await supabase
          .from('calendar_events')
          .update({
            technician_id: formData.technician_id,
            technician_name: technicianName,
            client_phone: serviceOrder.client_phone || null, // ✅ CORREÇÃO: Incluir telefone no update também
            start_time: fullDateTime,
            end_time: new Date(new Date(fullDateTime).getTime() + 60 * 60 * 1000).toISOString(), // +1 hora
            address: deliveryAddress,
            description: `Entrega de ${serviceOrder.equipment_type} - ${serviceOrder.client_name}`,
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEvents[0].id)
          .select()
          .single();

        if (scheduleError) throw scheduleError;
      } else {
        // 🎯 NOVA ARQUITETURA: Criar evento no calendário (fonte única da verdade)
        const { error: scheduleError } = await supabase
          .from('calendar_events')
          .insert({
            service_order_id: serviceOrder.id,
            technician_id: formData.technician_id,
            technician_name: technicianName,
            client_id: (serviceOrder as any).client_id || null,
            client_name: serviceOrder.client_name,
            client_phone: serviceOrder.client_phone || null, // ✅ CORREÇÃO: Incluir telefone do cliente
            equipment_type: serviceOrder.equipment_type,
            start_time: fullDateTime,
            end_time: new Date(new Date(fullDateTime).getTime() + 60 * 60 * 1000).toISOString(), // +1 hora
            address: deliveryAddress,
            description: `Entrega de ${serviceOrder.equipment_type} - ${serviceOrder.client_name}`,
            status: 'scheduled',
            event_type: 'delivery',
            // is_urgent: Não disponível na interface local
            // final_cost: Não disponível na interface local
          })
          .select()
          .single();

        if (scheduleError) throw scheduleError;
        console.log(`✅ [DeliverySchedulingDialog] Novo evento criado para OS ${serviceOrder.id}`);
      }

      // 2. Atualizar status da ordem de serviço para delivery_scheduled e reatribuir técnico
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'delivery_scheduled',
          technician_id: formData.technician_id,
          technician_name: technicianName,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceOrder.id);

      if (updateError) throw updateError;

      // 3. Buscar usuário atual para created_by
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserEmail = user?.email || 'sistema@eletrofix.com';

      // 4. Registrar evento na timeline
      const { error: eventError } = await supabase
        .from('service_events')
        .insert({
          service_order_id: serviceOrder.id,
          type: 'delivery_scheduled',
          description: JSON.stringify({
            scheduled_date: fullDateTime,
            technician_name: technicianName,
            delivery_address: deliveryAddress,
            notes: formData.delivery_notes,
            scheduled_by: 'admin'
          }),
          created_by: currentUserEmail
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
        delivery_notes: '',
        address_option: 'pickup'
      });

    } catch (error) {
      console.error('❌ Erro ao agendar entrega:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));

      // Mostrar erro mais específico
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error(`Erro ao agendar entrega: ${error.message}`);
      } else {
        toast.error('Erro ao agendar entrega. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!serviceOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agendar Entrega - {serviceOrder.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
          {/* Informações do equipamento */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
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

          {/* Calendário de Horários */}
          {formData.technician_id && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="h-4 w-4" />
                Selecione Data e Horário *
              </Label>
              <div className="overflow-x-auto">
                <TechnicianTimeSlots
                  selectedTechnicianId={formData.technician_id}
                  selectedDate={formData.scheduled_date}
                  selectedTime={formData.scheduled_time}
                  onTimeSlotSelect={handleTimeSlotSelect}
                  currentWeek={currentWeek}
                  onWeekChange={handleWeekChange}
                />
              </div>
              {formData.scheduled_date && formData.scheduled_time && (
                <div className="text-sm text-green-600 bg-green-50 p-2 sm:p-3 rounded">
                  ✅ Agendado para: {format(new Date(formData.scheduled_date), 'dd/MM/yyyy')} às {formData.scheduled_time}
                </div>
              )}
            </div>
          )}

          {/* Endereço de entrega */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="h-4 w-4" />
              Endereço de Entrega *
            </Label>

            <RadioGroup
              value={formData.address_option}
              onValueChange={handleAddressOptionChange}
              className="space-y-3"
            >
              {/* Opção: Endereço de Coleta */}
              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Endereço de Coleta</span>
                  </Label>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {serviceOrder.pickup_address}
                  </p>
                </div>
              </div>

              {/* Opção: Endereço do Cliente (se diferente) */}
              {(serviceOrder as any).client_address && (serviceOrder as any).client_address !== serviceOrder.pickup_address && (
                <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="client" id="client" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer">
                      <MapPinIcon className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Endereço do Cliente</span>
                    </Label>
                    <p className="text-sm text-gray-600 mt-1 break-words">
                      {(serviceOrder as any).client_address}
                    </p>
                  </div>
                </div>
              )}

              {/* Opção: Endereço Personalizado */}
              <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="custom" id="custom" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Endereço Personalizado</span>
                  </Label>
                  {formData.address_option === 'custom' && (
                    <Textarea
                      value={formData.delivery_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                      placeholder="Digite o endereço de entrega..."
                      rows={2}
                      className="mt-2 text-sm sm:text-base"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="delivery_notes" className="text-sm sm:text-base">Observações da Entrega</Label>
            <Textarea
              id="delivery_notes"
              value={formData.delivery_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_notes: e.target.value }))}
              placeholder="Instruções especiais, horário preferencial, etc..."
              rows={3}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleDelivery}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Agendando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm sm:text-base">Agendar Entrega</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
