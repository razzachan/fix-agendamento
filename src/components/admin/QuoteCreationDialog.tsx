import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, Calculator, Calendar } from 'lucide-react';
import { quoteService } from '@/services/admin/quoteService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuoteCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    service_attendance_type: string;
    diagnosis: {
      diagnosis_details: string;
      recommended_service: string;
    };
  } | null;
  onSuccess: () => void;
}

export function QuoteCreationDialog({ 
  open, 
  onOpenChange, 
  diagnosis, 
  onSuccess 
}: QuoteCreationDialogProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    laborCost: '',
    partsCost: '',
    estimatedDays: '',
    notes: '',
    validUntil: ''
  });

  // Calcular custo total automaticamente
  const totalCost = (parseFloat(formData.laborCost) || 0) + (parseFloat(formData.partsCost) || 0);

  // Definir data padrão de validade (30 dias a partir de hoje)
  React.useEffect(() => {
    if (open && diagnosis) {
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      
      setFormData({
        laborCost: '0',
        partsCost: '0',
        estimatedDays: '5',
        notes: '',
        validUntil: validUntilDate.toISOString().split('T')[0]
      });
    }
  }, [open, diagnosis]);

  const handleCreateQuote = async () => {
    if (!diagnosis || !user) return;

    // Validações
    if (!formData.laborCost || !formData.validUntil) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (totalCost <= 0) {
      toast.error('O valor total deve ser maior que zero.');
      return;
    }

    setIsCreating(true);
    try {
      const success = await quoteService.createQuote(
        diagnosis.id, // Este é o serviceOrderId, não o diagnosis.id
        user.id,
        {
          laborCost: parseFloat(formData.laborCost),
          partsCost: parseFloat(formData.partsCost) || 0,
          totalCost: totalCost,
          estimatedDays: parseInt(formData.estimatedDays) || 5,
          notes: formData.notes.trim() || undefined,
          validUntil: formData.validUntil
        }
      );

      if (success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast.error('Erro ao criar orçamento.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return 'Coleta para Diagnóstico';
      case 'coleta_conserto':
        return 'Coleta para Conserto';
      case 'em_domicilio':
        return 'Atendimento Domiciliar';
      default:
        return type;
    }
  };

  if (!diagnosis) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Criar Orçamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Diagnóstico */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-gray-900">Informações do Diagnóstico</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cliente:</span>
                <p className="font-medium">{diagnosis.client_name}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Equipamento:</span>
                <p className="font-medium">{diagnosis.equipment_type}</p>
                {diagnosis.equipment_model && (
                  <p className="text-xs text-gray-500">{diagnosis.equipment_model}</p>
                )}
              </div>
              
              <div className="col-span-2">
                <span className="text-gray-600">Diagnóstico:</span>
                <p className="font-medium">{diagnosis.diagnosis.diagnosis_details}</p>
              </div>
              
              <div className="col-span-2">
                <span className="text-gray-600">Serviço Recomendado:</span>
                <p className="font-medium">{diagnosis.diagnosis.recommended_service}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Tipo de Serviço:</span>
                <p className="font-medium">{getServiceTypeLabel(diagnosis.service_attendance_type)}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Estimativa Original:</span>
                <p className="font-medium text-green-600">
                  {formatCurrency(diagnosis.diagnosis.estimated_cost)}
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de Orçamento */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Detalhes do Orçamento</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="laborCost">Mão de Obra (R$) *</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.laborCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, laborCost: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="partsCost">Peças/Materiais (R$)</Label>
                <Input
                  id="partsCost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.partsCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, partsCost: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Total Calculado */}
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">Valor Total:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedDays">Prazo Estimado (dias)</Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  placeholder="5"
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDays: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido até *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre o orçamento, condições, etc..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Aviso sobre próximos passos */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Próximo passo:</strong> Após criar o orçamento, ele ficará disponível para aprovação 
              do cliente (online) ou você poderá confirmar a aprovação manualmente caso o cliente 
              confirme via WhatsApp/telefone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateQuote}
            disabled={isCreating || totalCost <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Criar Orçamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
