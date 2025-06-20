import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgendamentoAI } from '@/services/agendamentos';
import { useAppData } from '@/hooks/useAppData';
import { format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Wrench,
  Package,
  AlertTriangle,
  X
} from 'lucide-react';
import TechnicianTimeSlots from './TechnicianTimeSlots';
import MultipleEquipmentModal from './MultipleEquipmentModal';
import SingleEquipmentModal from './SingleEquipmentModal';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: AgendamentoAI | null;
  onOrderCreated: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  onOrderCreated
}) => {
  const { technicians, serviceOrders } = useAppData();
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTechnicianId('');
      setSelectedDate('');
      setSelectedTime('');
      setCurrentWeek(new Date());
      setShowEquipmentModal(false);
    }
  }, [isOpen]);

  if (!agendamento) return null;

  // Parse equipamentos
  const parseEquipamentos = (equipamentos: any): string[] => {
    if (Array.isArray(equipamentos)) return equipamentos;
    if (typeof equipamentos === 'string') {
      try {
        const parsed = JSON.parse(equipamentos);
        return Array.isArray(parsed) ? parsed : [equipamentos];
      } catch {
        return [equipamentos];
      }
    }
    return [];
  };

  // Parse problemas
  const parseProblemas = (problemas: any): string[] => {
    if (Array.isArray(problemas)) return problemas;
    if (typeof problemas === 'string') {
      try {
        const parsed = JSON.parse(problemas);
        return Array.isArray(parsed) ? parsed : [problemas];
      } catch {
        return [problemas];
      }
    }
    return [];
  };

  const equipamentos = parseEquipamentos(agendamento.equipamentos || agendamento.equipamento);
  const problemas = parseProblemas(agendamento.problemas || agendamento.problema);
  const hasMultipleEquipments = equipamentos.length > 1;

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Navegar semanas
  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'prev' ? -7 : 7));
  };

  // Lidar com seleção de horário
  const handleTimeSlotSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleProceedToEquipment = () => {
    if (!selectedDate || !selectedTime || !selectedTechnicianId) {
      alert('Por favor, selecione um técnico, data e horário.');
      return;
    }

    setShowEquipmentModal(true);
  };

  const handleEquipmentModalClose = () => {
    setShowEquipmentModal(false);
  };

  const handleOrderCreated = () => {
    setShowEquipmentModal(false);
    onClose();
    onOrderCreated();
  };

  return (
    <>
      <Dialog open={isOpen && !showEquipmentModal} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#e5b034]" />
                Criar Ordem de Serviço
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações do Agendamento */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-[#e5b034]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agendamento.nome}
                    </h3>
                    {agendamento.urgente && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Urgente
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {agendamento.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{formatPhone(agendamento.telefone)}</span>
                      </div>
                    )}
                    {agendamento.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{agendamento.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{agendamento.endereco}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Equipamentos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-[#e5b034]" />
                    <h4 className="font-medium text-gray-900">
                      {hasMultipleEquipments ? 'Equipamentos' : 'Equipamento'}
                    </h4>
                    {hasMultipleEquipments && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {equipamentos.length} itens
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {equipamentos.map((equipamento, index) => (
                      <div 
                        key={index}
                        className="flex items-start justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {equipamento}
                          </div>
                          {problemas[index] && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Problema:</span> {problemas[index]}
                            </div>
                          )}
                        </div>
                        {hasMultipleEquipments && (
                          <Badge variant="outline" className="ml-2">
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Técnico */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-[#e5b034]" />
                  <h4 className="font-medium text-gray-900">
                    Selecionar Técnico
                  </h4>
                </div>

                <div className="max-w-md">
                  <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(technician => (
                        <SelectItem key={technician.id} value={technician.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {technician.name}
                            {technician.specialty && (
                              <span className="text-xs text-gray-500">({technician.specialty})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Calendário de Horários */}
            <TechnicianTimeSlots
              selectedTechnicianId={selectedTechnicianId}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onTimeSlotSelect={handleTimeSlotSelect}
              currentWeek={currentWeek}
              onWeekChange={handleWeekChange}
            />

            {/* Resumo da Seleção */}
            {selectedDate && selectedTime && selectedTechnicianId && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Agendamento Confirmado
                    </span>
                  </div>
                  <div className="text-sm text-green-700">
                    <div>Data: {format(new Date(selectedDate), 'dd/MM/yyyy (EEEE)', { locale: ptBR })}</div>
                    <div>Horário: {selectedTime}</div>
                    <div>Técnico: {technicians.find(t => t.id === selectedTechnicianId)?.name}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão para prosseguir */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleProceedToEquipment}
                disabled={!selectedDate || !selectedTime || !selectedTechnicianId}
                className="bg-[#e5b034] hover:bg-[#d4a02a] text-white"
              >
                Prosseguir para Configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Equipamentos */}
      {showEquipmentModal && agendamento && (
        hasMultipleEquipments ? (
          <MultipleEquipmentModal
            isOpen={showEquipmentModal}
            onClose={handleEquipmentModalClose}
            agendamento={agendamento}
            scheduledDate={selectedDate}
            scheduledTime={selectedTime}
            preSelectedTechnicianId={selectedTechnicianId}
            onOrdersCreated={handleOrderCreated}
          />
        ) : (
          <SingleEquipmentModal
            isOpen={showEquipmentModal}
            onClose={handleEquipmentModalClose}
            agendamento={agendamento}
            scheduledDate={selectedDate}
            scheduledTime={selectedTime}
            preSelectedTechnicianId={selectedTechnicianId}
            onOrderCreated={handleOrderCreated}
          />
        )
      )}
    </>
  );
};

export default CreateOrderModal;
