import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { translateProgressType } from '@/utils/translations';

interface RepairProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    status: string;
  };
  onSuccess: () => void;
}

export function RepairProgressDialog({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: RepairProgressDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressType, setProgressType] = useState('');
  const [notes, setNotes] = useState('');

  const isStartingRepair = order.status === 'quote_approved';

  // Resetar campos quando o dialog abre
  React.useEffect(() => {
    if (open) {
      if (isStartingRepair) {
        setProgressType('started');
        setNotes('Reparo iniciado. Orçamento aprovado pelo cliente.');
      } else {
        setProgressType('');
        setNotes('');
      }
    }
  }, [open, isStartingRepair]);

  const handleSubmit = async () => {
    if (!user || !progressType || !notes.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Criar evento de progresso do reparo
      const progressDescription = JSON.stringify({
        progress_type: progressType,
        notes: notes.trim(),
        updated_by: user.id,
        timestamp: new Date().toISOString()
      });

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: order.id,
          p_type: 'repair',
          p_created_by: user.id,
          p_description: progressDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de reparo:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem se necessário
      if (isStartingRepair) {
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ status: 'in_progress' })
          .eq('id', order.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar status da ordem:', updateError);
          throw updateError;
        }

        // 3. Criar notificação para início do reparo
        try {
          // Usar função de formatação para número da ordem
          const orderNumber = order.order_number || `#${order.id.substring(0, 3).toUpperCase()}`;
          const equipmentInfo = order.equipment_model
            ? `${order.equipment_type} ${order.equipment_model}`
            : order.equipment_type;

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: '00000000-0000-0000-0000-000000000001',
              title: '🔧 Reparo Iniciado',
              description: `O reparo do equipamento ${equipmentInfo} de ${order.client_name} foi iniciado na oficina. OS ${orderNumber}`,
              type: 'info',
              read: false,
              time: new Date().toISOString()
            });

          if (notificationError) {
            console.error('❌ Erro ao criar notificação de início de reparo:', notificationError);
          } else {
            console.log('✅ Notificação de início de reparo criada com sucesso');
          }
        } catch (notificationError) {
          console.error('❌ Erro geral ao criar notificação de início de reparo:', notificationError);
        }
      }

      // 3. Criar notificação para progresso do reparo (apenas se não for início)
      if (!isStartingRepair) {
        try {
          // Buscar admin principal para notificação
          const { data: adminUser, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .single();

          if (adminError || !adminUser) {
            console.error('❌ Erro ao buscar admin para notificação:', adminError);
            return;
          }

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: adminUser.id,
              title: '📈 Progresso do Reparo',
              description: `Atualização no reparo do equipamento ${order.equipment_type} de ${order.client_name}. Tipo: ${translateProgressType(progressType)}. Notas: ${notes.trim() || 'Sem observações'}. OS #${order.id.substring(0, 8)}`,
              type: 'info',
              read: false,
              time: new Date().toISOString()
            });

          if (notificationError) {
            console.error('❌ Erro ao criar notificação de progresso:', notificationError);
          } else {
            console.log('✅ Notificação de progresso criada com sucesso para admin:', adminUser.id);
          }
        } catch (notificationError) {
          console.error('❌ Erro geral ao criar notificação de progresso:', notificationError);
        }
      }

      console.log('✅ Progresso do reparo registrado com sucesso');
      onSuccess();

    } catch (error) {
      console.error('❌ Erro ao registrar progresso do reparo:', error);
      toast.error('Erro ao registrar progresso do reparo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const progressOptions = isStartingRepair ? [
    { value: 'started', label: 'Reparo Iniciado' }
  ] : [
    { value: 'parts_ordered', label: 'Peças Solicitadas' },
    { value: 'parts_received', label: 'Peças Recebidas' },
    { value: 'disassembly', label: 'Desmontagem' },
    { value: 'repair_in_progress', label: 'Reparo em Andamento' },
    { value: 'assembly', label: 'Montagem' },
    { value: 'testing', label: 'Testes' },
    { value: 'quality_check', label: 'Controle de Qualidade' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isStartingRepair ? (
              <>
                <Play className="h-5 w-5 text-blue-600" />
                Iniciar Reparo
              </>
            ) : (
              <>
                <Wrench className="h-5 w-5 text-yellow-600" />
                Atualizar Progresso do Reparo
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Equipamento */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Cliente:</strong> {order.client_name}</div>
              <div><strong>Equipamento:</strong> {order.equipment_type}</div>
              {order.equipment_model && (
                <div><strong>Modelo:</strong> {order.equipment_model}</div>
              )}
            </div>
          </div>

          {/* Tipo de Progresso */}
          <div className="space-y-2">
            <Label htmlFor="progressType">
              {isStartingRepair ? 'Confirmação de Início' : 'Tipo de Progresso'}
            </Label>
            <Select value={progressType} onValueChange={setProgressType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de progresso" />
              </SelectTrigger>
              <SelectContent>
                {progressOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder={
                isStartingRepair 
                  ? "Descreva o início do reparo, peças necessárias, previsão, etc..."
                  : "Descreva o progresso atual, dificuldades encontradas, próximos passos, etc..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Aviso sobre próximos passos */}
          <div className={`p-3 rounded-lg ${isStartingRepair ? 'bg-blue-50' : 'bg-yellow-50'}`}>
            <p className={`text-sm ${isStartingRepair ? 'text-blue-800' : 'text-yellow-800'}`}>
              <strong>
                {isStartingRepair ? 'Próximo passo:' : 'Lembrete:'}
              </strong> {isStartingRepair 
                ? 'Após iniciar o reparo, você poderá atualizar o progresso conforme necessário até marcar como concluído.'
                : 'Continue atualizando o progresso até que o reparo esteja completo e pronto para entrega.'
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing || !progressType || !notes.trim()}
            className={isStartingRepair ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isStartingRepair ? (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Reparo
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Atualizar Progresso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
