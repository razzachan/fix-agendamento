import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, CheckCircle, Receipt, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceOrder {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  final_cost?: number;
  initial_cost?: number;
  service_attendance_type: string;
}

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrder | null;
  onPaymentConfirmed: () => void;
}

export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  serviceOrder,
  onPaymentConfirmed
}: PaymentConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [finalCost, setFinalCost] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState(1); // Controle dos estágios
  const [formData, setFormData] = useState({
    payment_method: '',
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_notes: '',
    discount_amount: '0',
    discount_reason: ''
  });

  useEffect(() => {
    if (open && serviceOrder) {
      // Reset para o primeiro estágio
      setCurrentStep(1);
      // Buscar custo final do reparo
      loadFinalCost();
      setFormData(prev => ({
        ...prev,
        payment_amount: serviceOrder.final_cost?.toString() || '0'
      }));
    }
  }, [open, serviceOrder]);

  const loadFinalCost = async () => {
    if (!serviceOrder) return;

    try {
      let finalCostValue = 0;

      // Para coleta_diagnostico, buscar o valor do orçamento aprovado
      if (serviceOrder.service_attendance_type === 'coleta_diagnostico') {
        console.log('🔍 Buscando orçamento aprovado para coleta_diagnostico');

        // Buscar eventos de diagnóstico para pegar o orçamento aprovado
        const { data: diagnosisData, error: diagnosisError } = await supabase
          .from('service_events')
          .select('description')
          .eq('service_order_id', serviceOrder.id)
          .eq('type', 'diagnosis')
          .order('created_at', { ascending: false })
          .limit(1);

        if (diagnosisError) throw diagnosisError;

        if (diagnosisData && diagnosisData.length > 0) {
          const description = typeof diagnosisData[0].description === 'string'
            ? JSON.parse(diagnosisData[0].description)
            : diagnosisData[0].description;

          // Para coleta_diagnostico, o valor a receber na entrega é o estimated_cost do diagnóstico
          if (description.estimated_cost) {
            finalCostValue = parseFloat(description.estimated_cost);
            console.log('💰 Valor do orçamento encontrado:', finalCostValue);
          }
        }
      } else {
        // Para outros tipos, buscar eventos de reparo para pegar o custo final
        const { data, error } = await supabase
          .from('service_events')
          .select('description')
          .eq('service_order_id', serviceOrder.id)
          .eq('type', 'repair')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const description = typeof data[0].description === 'string'
            ? JSON.parse(data[0].description)
            : data[0].description;

          if (description.final_cost) {
            finalCostValue = description.final_cost;
          }
        }
      }

      // Se não encontrou valor nos eventos, usar o final_cost da ordem
      if (finalCostValue === 0 && serviceOrder.final_cost) {
        finalCostValue = serviceOrder.final_cost;
      }

      console.log('💰 Valor final calculado:', finalCostValue);
      setFinalCost(finalCostValue);
      setFormData(prev => ({
        ...prev,
        payment_amount: finalCostValue.toString()
      }));

    } catch (error) {
      console.error('❌ Erro ao carregar custo final:', error);
    }
  };

  const calculateFinalAmount = () => {
    const amount = parseFloat(formData.payment_amount) || 0;
    const discount = parseFloat(formData.discount_amount) || 0;
    return Math.max(0, amount - discount);
  };

  const handleNextStep = () => {
    // Validação básica antes de avançar
    if (!formData.payment_method || !formData.payment_amount) {
      toast.error('Preencha o método de pagamento e valor');
      return;
    }
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  const handleConfirmPayment = async () => {
    if (!serviceOrder) return;

    // Validações
    if (!formData.payment_method || !formData.payment_amount) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const finalAmount = calculateFinalAmount();
    if (finalAmount <= 0) {
      toast.error('O valor final do pagamento deve ser maior que zero.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Registrar pagamento
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          service_order_id: serviceOrder.id,
          amount: parseFloat(formData.payment_amount),
          discount_amount: parseFloat(formData.discount_amount),
          final_amount: finalAmount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          notes: formData.payment_notes,
          discount_reason: formData.discount_reason,
          status: 'confirmed',
          confirmed_by: 'admin'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Atualizar status da ordem de serviço e payment_status
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'completed',
          payment_status: 'completed'
        })
        .eq('id', serviceOrder.id);

      if (updateError) throw updateError;

      // 3. Registrar evento na timeline
      const { error: eventError } = await supabase
        .from('service_events')
        .insert({
          service_order_id: serviceOrder.id,
          type: 'payment_confirmed',
          created_by: 'admin-demo-id',
          description: JSON.stringify({
            payment_method: formData.payment_method,
            amount: parseFloat(formData.payment_amount),
            discount_amount: parseFloat(formData.discount_amount),
            final_amount: finalAmount,
            payment_date: formData.payment_date,
            notes: formData.payment_notes,
            confirmed_by: 'admin'
          })
        });

      if (eventError) throw eventError;

      toast.success('Pagamento confirmado com sucesso!');
      onPaymentConfirmed();
      onOpenChange(false);

      // Reset form e step
      setCurrentStep(1);
      setFormData({
        payment_method: '',
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_notes: '',
        discount_amount: '0',
        discount_reason: ''
      });

    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento:', error);
      toast.error('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente do Estágio 1
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Informações básicas do serviço */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          {serviceOrder.equipment_type} - {serviceOrder.client_name}
        </h4>

        {/* Discriminação de valores para coleta_diagnostico */}
        {serviceOrder.service_attendance_type === 'coleta_diagnostico' && finalCost > 0 && (
          <div className="space-y-2 text-sm">
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-800 mb-2">💰 Discriminação de Valores:</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor total do serviço:</span>
                  <span className="font-medium">R$ {(serviceOrder.final_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>(-) Sinal já pago na coleta:</span>
                  <span className="font-medium">- R$ {(serviceOrder.initial_cost || 350).toFixed(2)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold text-blue-600">
                  <span>Valor a receber na entrega:</span>
                  <span>R$ {finalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Para outros tipos de serviço */}
        {serviceOrder.service_attendance_type !== 'coleta_diagnostico' && finalCost > 0 && (
          <p className="text-sm text-gray-600">
            <strong>Valor a receber: R$ {finalCost.toFixed(2)}</strong>
          </p>
        )}
      </div>

      {/* Método de pagamento */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Método de Pagamento *
        </Label>
        <Select
          value={formData.payment_method}
          onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="transferencia">Transferência Bancária</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Valor do pagamento */}
        <div className="space-y-2">
          <Label htmlFor="payment_amount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor do Pagamento *
          </Label>
          <Input
            id="payment_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.payment_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>

        {/* Desconto */}
        <div className="space-y-2">
          <Label htmlFor="discount_amount">Desconto (R$)</Label>
          <Input
            id="discount_amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.discount_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Motivo do desconto */}
      {parseFloat(formData.discount_amount) > 0 && (
        <div className="space-y-2">
          <Label htmlFor="discount_reason">Motivo do Desconto</Label>
          <Input
            id="discount_reason"
            value={formData.discount_reason}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_reason: e.target.value }))}
            placeholder="Ex: Cliente fidelizado, promoção, etc..."
          />
        </div>
      )}

      {/* Valor final */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">Valor Final:</span>
          <span className="text-xl font-bold text-blue-600">
            R$ {calculateFinalAmount().toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );

  // Componente do Estágio 2
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Resumo do pagamento */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium mb-3 flex items-center gap-2 text-green-800">
          <CheckCircle className="h-4 w-4" />
          Resumo do Pagamento
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Método:</span>
            <span className="font-medium">{formData.payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span>Valor:</span>
            <span>R$ {formData.payment_amount}</span>
          </div>
          {parseFloat(formData.discount_amount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Desconto:</span>
              <span>- R$ {formData.discount_amount}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total Final:</span>
            <span className="text-green-600">R$ {calculateFinalAmount().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Detalhes do serviço */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Detalhes do Serviço
        </h4>
        <div className="text-sm space-y-1">
          <p><strong>Equipamento:</strong> {serviceOrder.equipment_type}</p>
          <p><strong>Cliente:</strong> {serviceOrder.client_name}</p>
          <p><strong>Tipo:</strong> {serviceOrder.service_attendance_type}</p>
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="payment_notes">Observações do Pagamento</Label>
        <Textarea
          id="payment_notes"
          value={formData.payment_notes}
          onChange={(e) => setFormData(prev => ({ ...prev, payment_notes: e.target.value }))}
          placeholder="Informações adicionais sobre o pagamento..."
          rows={3}
        />
      </div>
    </div>
  );

  if (!serviceOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Confirmar Pagamento - Etapa {currentStep}/2
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">{serviceOrder.client_name}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </div>

        {/* Botões fixos na parte inferior */}
        <div className="flex-shrink-0 border-t bg-white px-6 py-4">
          <div className="flex justify-between">
            {/* Botões da esquerda */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              {currentStep === 2 && (
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
            </div>

            {/* Botões da direita */}
            <div className="flex gap-3">
              {currentStep === 1 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Pagamento
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
