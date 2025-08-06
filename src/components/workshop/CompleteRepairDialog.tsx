import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';

interface CompleteRepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    service_attendance_type: string;
  };
  onSuccess: () => void;
}

export function CompleteRepairDialog({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: CompleteRepairDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    completionNotes: '',
    warrantyPeriod: '90',
    warrantyTerms: '',
    qualityCheck: ''
  });

  // Resetar campos quando o dialog abre
  React.useEffect(() => {
    if (open) {
      setFormData({
        completionNotes: '',
        warrantyPeriod: '90',
        warrantyTerms: 'Garantia de 90 dias para o serviço realizado, exceto danos causados por mau uso.',
        qualityCheck: 'Equipamento testado e funcionando perfeitamente.'
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !formData.completionNotes.trim() || !formData.qualityCheck.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Criar evento de conclusão do reparo
      const completionDescription = JSON.stringify({
        completion_notes: formData.completionNotes.trim(),
        warranty_period: parseInt(formData.warrantyPeriod) || 90,
        warranty_terms: formData.warrantyTerms.trim(),
        quality_check: formData.qualityCheck.trim(),
        completed_by: user.id,
        completion_date: new Date().toISOString()
      });

      const { error: eventError } = await supabase
        .rpc('insert_service_event', {
          p_service_order_id: order.id,
          p_type: 'repair',
          p_created_by: user.id,
          p_description: completionDescription
        });

      if (eventError) {
        console.error('❌ Erro ao criar evento de conclusão:', eventError);
        throw eventError;
      }

      // 2. Atualizar status da ordem e dados de garantia
      const updateData: any = {
        status: 'ready_for_delivery',
        completed_date: new Date().toISOString()
      };

      // Adicionar dados de garantia se fornecidos
      if (formData.warrantyPeriod) {
        const warrantyStartDate = new Date();
        const warrantyEndDate = new Date();
        warrantyEndDate.setDate(warrantyStartDate.getDate() + parseInt(formData.warrantyPeriod));
        
        updateData.warranty_period = parseInt(formData.warrantyPeriod);
        updateData.warranty_start_date = warrantyStartDate.toISOString();
        updateData.warranty_end_date = warrantyEndDate.toISOString();
        updateData.warranty_terms = formData.warrantyTerms.trim();
      }

      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', order.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar status da ordem:', updateError);
        throw updateError;
      }

      console.log('✅ Reparo concluído com sucesso');

      // 3. Disparar notificação para admin agendar entrega
      try {
        // Buscar dados atualizados da ordem
        const { data: updatedOrder } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', order.id)
          .single();

        if (updatedOrder) {
          await notificationTriggers.onStatusChanged(updatedOrder, 'in_progress', 'ready_for_delivery');
        }
      } catch (notificationError) {
        console.error('⚠️ Erro ao disparar notificação de equipamento pronto:', notificationError);
        // Não falhar o processo por causa de notificação
      }

      onSuccess();

    } catch (error) {
      console.error('❌ Erro ao concluir reparo:', error);
      toast.error('Erro ao concluir reparo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getNextStepMessage = () => {
    switch (order.service_attendance_type) {
      case 'coleta_diagnostico':
      case 'coleta_conserto':
        return 'Após concluir, o equipamento ficará pronto para coleta pelo técnico e entrega ao cliente.';
      case 'em_domicilio':
        return 'Após concluir, o técnico será notificado para retornar e entregar o equipamento ao cliente.';
      default:
        return 'Após concluir, o equipamento ficará pronto para entrega ao cliente.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Concluir Reparo
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

          {/* Observações da Conclusão */}
          <div className="space-y-2">
            <Label htmlFor="completionNotes">Observações da Conclusão *</Label>
            <Textarea
              id="completionNotes"
              placeholder="Descreva o que foi feito, peças trocadas, testes realizados, etc..."
              value={formData.completionNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, completionNotes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Controle de Qualidade */}
          <div className="space-y-2">
            <Label htmlFor="qualityCheck">Controle de Qualidade *</Label>
            <Textarea
              id="qualityCheck"
              placeholder="Confirme que o equipamento foi testado e está funcionando corretamente..."
              value={formData.qualityCheck}
              onChange={(e) => setFormData(prev => ({ ...prev, qualityCheck: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Período de Garantia */}
            <div className="space-y-2">
              <Label htmlFor="warrantyPeriod">Garantia (dias)</Label>
              <Input
                id="warrantyPeriod"
                type="number"
                placeholder="90"
                value={formData.warrantyPeriod}
                onChange={(e) => setFormData(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
              />
            </div>


          </div>

          {/* Termos da Garantia */}
          <div className="space-y-2">
            <Label htmlFor="warrantyTerms">Termos da Garantia</Label>
            <Textarea
              id="warrantyTerms"
              placeholder="Condições e limitações da garantia..."
              value={formData.warrantyTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, warrantyTerms: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Aviso sobre próximos passos */}
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Próximo passo:</strong> {getNextStepMessage()}
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
            disabled={isProcessing || !formData.completionNotes.trim() || !formData.qualityCheck.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Concluir Reparo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
