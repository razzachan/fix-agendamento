import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { quoteService } from '@/services/admin/quoteService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuoteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    service_attendance_type: string;
    quote: {
      labor_cost: number;
      parts_cost: number;
      total_cost: number;
      estimated_days: number;
      notes?: string;
      valid_until: string;
    };
  } | null;
  approvalType: 'approve' | 'reject';
  onSuccess: () => void;
}

export function QuoteApprovalDialog({ 
  open, 
  onOpenChange, 
  quote, 
  approvalType,
  onSuccess 
}: QuoteApprovalDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  // Resetar notas quando o dialog abre
  React.useEffect(() => {
    if (open) {
      if (approvalType === 'approve') {
        setNotes('Cliente confirmou aprovação via WhatsApp/telefone.');
      } else {
        setNotes('');
      }
    }
  }, [open, approvalType]);

  const handleApproval = async () => {
    if (!quote || !user) return;

    if (!notes.trim()) {
      toast.error('Adicione uma observação sobre a aprovação/rejeição.');
      return;
    }

    setIsProcessing(true);
    try {
      let success = false;
      
      if (approvalType === 'approve') {
        success = await quoteService.approveQuoteManually(
          quote.id,
          user.id,
          notes.trim()
        );
      } else {
        success = await quoteService.rejectQuoteManually(
          quote.id,
          user.id,
          notes.trim()
        );
      }

      if (success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
      toast.error('Erro ao processar aprovação.');
    } finally {
      setIsProcessing(false);
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

  if (!quote) return null;

  const isApproval = approvalType === 'approve';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproval ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprovar Orçamento Manualmente
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Rejeitar Orçamento
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Orçamento */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Detalhes do Orçamento</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Cliente:</span>
                <p className="font-medium">{quote.client_name}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Equipamento:</span>
                <p className="font-medium">{quote.equipment_type}</p>
                {quote.equipment_model && (
                  <p className="text-xs text-gray-500">{quote.equipment_model}</p>
                )}
              </div>
              
              <div>
                <span className="text-gray-600">Tipo de Serviço:</span>
                <p className="font-medium">{getServiceTypeLabel(quote.service_attendance_type)}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Valor Total:</span>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(quote.quote.total_cost)}
                </p>
              </div>
              
              <div>
                <span className="text-gray-600">Mão de Obra:</span>
                <p className="font-medium">{formatCurrency(quote.quote.labor_cost)}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Peças/Materiais:</span>
                <p className="font-medium">{formatCurrency(quote.quote.parts_cost)}</p>
              </div>
              
              <div>
                <span className="text-gray-600">Prazo:</span>
                <p className="font-medium">{quote.quote.estimated_days} dias</p>
              </div>
              
              <div>
                <span className="text-gray-600">Válido até:</span>
                <p className="font-medium">
                  {new Date(quote.quote.valid_until).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            {quote.quote.notes && (
              <div>
                <span className="text-gray-600">Observações do Orçamento:</span>
                <p className="text-sm text-gray-700">{quote.quote.notes}</p>
              </div>
            )}
          </div>

          {/* Campo de Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {isApproval ? 'Como o cliente confirmou a aprovação?' : 'Motivo da rejeição'}
            </Label>
            <Textarea
              id="notes"
              placeholder={
                isApproval 
                  ? "Ex: Cliente confirmou aprovação via WhatsApp às 14:30, disse que pode levar o equipamento na segunda-feira..."
                  : "Ex: Cliente achou o valor muito alto, vai procurar outras opções..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Aviso sobre próximos passos */}
          <div className={`p-3 rounded-lg ${isApproval ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm ${isApproval ? 'text-green-800' : 'text-red-800'}`}>
              <strong>Próximo passo:</strong> {isApproval 
                ? 'Após aprovar, a oficina será notificada para iniciar o reparo do equipamento.'
                : 'Após rejeitar, o orçamento será marcado como rejeitado e o processo será encerrado.'
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
            onClick={handleApproval}
            disabled={isProcessing || !notes.trim()}
            className={isApproval ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isApproval ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Aprovação
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Confirmar Rejeição
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
