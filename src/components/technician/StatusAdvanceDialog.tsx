import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Camera, CreditCard, CheckCircle, AlertTriangle, DollarSign, ArrowRight, ArrowLeft, QrCode } from 'lucide-react';
import { PaymentStageService, PaymentStageConfig } from '@/services/payments/paymentStageService';
import PhotoCaptureDialog from '@/components/ServiceOrders/OrdersTable/PhotoCapture/PhotoCaptureDialog';
import QRCodeGenerator from '@/components/qrcode/QRCodeGenerator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ServiceOrder {
  id: string;
  order_number?: string; // ✅ Número sequencial da OS
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  equipment_serial?: string;
  service_attendance_type: string;
  status: string;
  final_cost?: number;
  pickup_address?: string;
}

interface StatusAdvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrder | null;
  nextStatus: string;
  nextStatusLabel: string;
  technicianId: string;
  technicianName: string;
  onStatusUpdate: (orderId: string, status: string) => Promise<boolean>;
}

export function StatusAdvanceDialog({
  open,
  onOpenChange,
  serviceOrder,
  nextStatus,
  nextStatusLabel,
  technicianId,
  technicianName,
  onStatusUpdate
}: StatusAdvanceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'requirements' | 'qrcode' | 'photo' | 'payment' | 'confirm'>('requirements');
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1); // Sub-steps do pagamento
  const [paymentConfig, setPaymentConfig] = useState<PaymentStageConfig | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [requiresQRCode, setRequiresQRCode] = useState(false);
  const [photoCompleted, setPhotoCompleted] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [qrCodeCompleted, setQrCodeCompleted] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [hasExistingPhotos, setHasExistingPhotos] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    notes: '',
    discount_amount: '0',
    discount_reason: ''
  });

  useEffect(() => {
    if (open && serviceOrder) {
      setStep('requirements');
      setPaymentStep(1); // Reset para o primeiro sub-step
      setPhotoCompleted(false);
      setPaymentCompleted(false);
      setQrCodeCompleted(false);
      setShowPhotoDialog(false);
      analyzeRequirements();
      checkExistingPhotos();
    }
  }, [open, serviceOrder, nextStatus]);

  const analyzeRequirements = async () => {
    if (!serviceOrder) return;

    console.log('🎯 [StatusAdvanceDialog] analyzeRequirements iniciado:', {
      nextStatus,
      serviceType: serviceOrder.service_attendance_type,
      orderId: serviceOrder.id
    });

    let config: PaymentStageConfig | null = null;
    let needsPayment = false;
    let needsPhoto = false;
    let needsQRCode = false;

    // Determinar que tipo de pagamento é necessário baseado no status
    if (nextStatus === 'collected_for_diagnosis' || nextStatus === 'collected_for_repair' || nextStatus === 'collected') {
      console.log('🎯 [StatusAdvanceDialog] Detectado status de coleta - calculando pagamento');
      config = PaymentStageService.calculateCollectionPayment(serviceOrder);
      needsPhoto = true; // Sempre precisa de foto na coleta

      // Verificar se precisa de QR Code (apenas para coleta_conserto e coleta_diagnostico)
      needsQRCode = ['coleta_conserto', 'coleta_diagnostico'].includes(serviceOrder.service_attendance_type);

      console.log('🎯 [StatusAdvanceDialog] Config de pagamento calculada:', config);
      console.log('🏷️ [StatusAdvanceDialog] QR Code necessário:', needsQRCode);
    } else if (nextStatus === 'completed' || nextStatus === 'delivered') {
      if (serviceOrder.service_attendance_type === 'em_domicilio') {
        config = PaymentStageService.calculateFullPayment(serviceOrder);
        needsPhoto = false; // Serviços em domicílio não precisam de foto
      } else {
        config = await PaymentStageService.calculateDeliveryPayment(serviceOrder);
        needsPhoto = true; // Coleta/entrega precisa de foto na conclusão
      }
    } else if (nextStatus === 'payment_pending') {
      // Para outros tipos (não em domicílio), verificar se é entrega
      config = await PaymentStageService.calculateDeliveryPayment(serviceOrder);
      needsPhoto = true; // Coleta/entrega precisa de foto
    }

    console.log('🎯 [StatusAdvanceDialog] Resultado final:', {
      config,
      requiresPayment: !!config,
      requiresPhoto: needsPhoto,
      requiresQRCode: needsQRCode,
      step: 'requirements'
    });

    setPaymentConfig(config);
    setRequiresPayment(!!config);
    setRequiresPhoto(needsPhoto);
    setRequiresQRCode(needsQRCode);
    setStep('requirements');
  };

  const checkExistingPhotos = async () => {
    if (!serviceOrder) return;

    try {
      const { data, error } = await supabase
        .from('service_order_images')
        .select('id')
        .eq('service_order_id', serviceOrder.id);

      if (error) throw error;

      const hasPhotos = (data?.length || 0) > 0;
      setHasExistingPhotos(hasPhotos);
      setPhotoCompleted(hasPhotos);
    } catch (error) {
      console.error('Erro ao verificar fotos existentes:', error);
    }
  };

  const handlePhotoSuccess = () => {
    setPhotoCompleted(true);
    setShowPhotoDialog(false);
    toast.success('Foto adicionada com sucesso!');

    // Avançar para próximo step
    if (requiresPayment && !paymentCompleted) {
      setStep('payment');
    } else {
      setStep('confirm');
    }
  };

  const handleQRCodeGenerated = () => {
    setQrCodeCompleted(true);
    toast.success('QR Code gerado com sucesso!');

    // NÃO avançar automaticamente - deixar o usuário ver e imprimir a etiqueta
    // O usuário clicará em "Continuar" quando estiver pronto
    console.log('✅ [StatusAdvanceDialog] QR Code marcado como concluído, aguardando ação do usuário');
  };

  const calculateFinalAmount = () => {
    if (!paymentConfig) return 0;
    const discount = parseFloat(paymentData.discount_amount) || 0;
    return Math.max(0, paymentConfig.amount - discount);
  };

  const handlePaymentNextStep = () => {
    // Validação básica antes de avançar
    if (!paymentData.payment_method) {
      toast.error('Selecione o método de pagamento');
      return;
    }
    setPaymentStep(2);
  };

  const handlePaymentPreviousStep = () => {
    setPaymentStep(1);
  };

  const handlePaymentConfirm = async () => {
    if (!serviceOrder || !paymentConfig) return;

    if (!paymentData.payment_method) {
      toast.error('Selecione o método de pagamento.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await PaymentStageService.recordStagePayment(
        serviceOrder.id,
        paymentConfig,
        {
          payment_method: paymentData.payment_method,
          technician_id: technicianId,
          technician_name: technicianName,
          notes: paymentData.notes,
          discount_amount: parseFloat(paymentData.discount_amount) || 0,
          discount_reason: paymentData.discount_reason
        }
      );

      if (success) {
        setPaymentCompleted(true);

        // 🎯 AUTOMAÇÃO: Verificar se é pagamento final que deve concluir automaticamente
        const isCompletionPayment = (
          paymentConfig.stage === 'delivery' ||
          paymentConfig.stage === 'full' ||
          nextStatus === 'completed' ||
          nextStatus === 'delivered' ||
          serviceOrder.status === 'payment_pending' // Quando já está em payment_pending, é sempre pagamento final
        );

        console.log('🎯 [StatusAdvanceDialog] Verificando automação:', {
          paymentStage: paymentConfig.stage,
          nextStatus,
          currentStatus: serviceOrder.status,
          isCompletionPayment
        });

        if (isCompletionPayment) {
          console.log('🎯 [StatusAdvanceDialog] Pagamento final detectado - concluindo automaticamente');

          // Atualizar status automaticamente
          const statusUpdateSuccess = await onStatusUpdate(serviceOrder.id, nextStatus);

          if (statusUpdateSuccess) {
            toast.success(`Pagamento confirmado e ordem concluída automaticamente!`);
            onOpenChange(false);

            // Reset state
            setStep('requirements');
            setPaymentStep(1);
            setPhotoCompleted(false);
            setPaymentCompleted(false);
            setQrCodeCompleted(false);
            setPaymentData({
              payment_method: '',
              notes: '',
              discount_amount: '0',
              discount_reason: ''
            });
          } else {
            toast.error('Pagamento confirmado, mas erro ao atualizar status.');
            setStep('confirm'); // Fallback para confirmação manual
          }
        } else {
          // Para pagamentos intermediários (coleta), continuar com o fluxo normal
          toast.success('Pagamento confirmado com sucesso!');
          setStep('confirm');
        }
      } else {
        toast.error('Erro ao confirmar pagamento.');
      }
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao confirmar pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirm = async () => {
    if (!serviceOrder) return;

    setIsLoading(true);
    try {
      const success = await onStatusUpdate(serviceOrder.id, nextStatus);

      if (success) {
        toast.success(`Status atualizado para: ${nextStatusLabel}`);
        onOpenChange(false);

        // Reset state
        setStep('requirements');
        setPhotoCompleted(false);
        setPaymentCompleted(false);
        setQrCodeCompleted(false);
        setPaymentData({
          payment_method: '',
          notes: '',
          discount_amount: '0',
          discount_reason: ''
        });
      } else {
        toast.error('Erro ao atualizar status.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRequirementsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Requisitos para Avançar Status</h3>
        <p className="text-muted-foreground">
          Para avançar para "{nextStatusLabel}", você precisa completar:
        </p>
      </div>

      <div className="space-y-3">
        {requiresPhoto && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <h4 className="font-medium">Foto do Equipamento</h4>
                  <p className="text-sm text-muted-foreground">
                    {hasExistingPhotos
                      ? "Fotos já existem. Você pode adicionar mais se necessário."
                      : "Tire uma foto para documentar o estado do equipamento"
                    }
                  </p>
                </div>
                <Badge variant={photoCompleted ? "default" : "secondary"}>
                  {photoCompleted ? "Concluído" : "Pendente"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {requiresQRCode && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <h4 className="font-medium">QR Code de Rastreamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Gere e imprima etiqueta QR Code para rastrear o equipamento
                  </p>
                </div>
                <Badge variant={qrCodeCompleted ? "default" : "secondary"}>
                  {qrCodeCompleted ? "Concluído" : "Pendente"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {requiresPayment && paymentConfig && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <h4 className="font-medium">Confirmação de Pagamento</h4>
                  <p className="text-sm text-muted-foreground">
                    {paymentConfig.description}
                  </p>
                  <p className="text-sm font-medium text-green-600">
                    Valor: R$ {paymentConfig.amount.toFixed(2)}
                  </p>
                </div>
                <Badge variant={paymentCompleted ? "default" : "secondary"}>
                  {paymentCompleted ? "Concluído" : "Pendente"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>

        {requiresQRCode && !qrCodeCompleted && (
          <Button onClick={() => setStep('qrcode')}>
            <QrCode className="h-4 w-4 mr-2" />
            Gerar QR Code
          </Button>
        )}

        {requiresPhoto && (!requiresQRCode || qrCodeCompleted) && !photoCompleted && (
          <Button onClick={() => setShowPhotoDialog(true)}>
            <Camera className="h-4 w-4 mr-2" />
            {hasExistingPhotos ? 'Adicionar Foto' : 'Tirar Foto'}
          </Button>
        )}

        {requiresPayment && (!requiresQRCode || qrCodeCompleted) && (!requiresPhoto || photoCompleted) && !paymentCompleted && (
          <Button onClick={() => setStep('payment')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Confirmar Pagamento
          </Button>
        )}

        {(!requiresQRCode || qrCodeCompleted) && (!requiresPhoto || photoCompleted) && (!requiresPayment || paymentCompleted) && (
          <Button onClick={() => setStep('confirm')}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Finalizar
          </Button>
        )}
      </div>
    </div>
  );

  // Sub-step 1: Configuração básica do pagamento
  const renderPaymentStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CreditCard className="h-12 w-12 mx-auto text-green-500 mb-3" />
        <h3 className="text-lg font-semibold mb-2">Configuração do Pagamento - Etapa 1/2</h3>
        <p className="text-muted-foreground">
          Configure os dados básicos do pagamento
        </p>
      </div>

      {paymentConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Detalhes do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 mb-2">{paymentConfig.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-medium">Valor a Receber:</span>
                <span className="text-xl font-bold text-green-600">
                  R$ {paymentConfig.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Método de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pagamento *</Label>
                <Select
                  value={paymentData.payment_method}
                  onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desconto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Desconto (R$)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min="0"
                    max={paymentConfig.amount}
                    step="0.01"
                    value={paymentData.discount_amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, discount_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Final</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                    <span className="font-medium text-green-600">
                      R$ {calculateFinalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Motivo do Desconto */}
              {parseFloat(paymentData.discount_amount) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="discount_reason">Motivo do Desconto *</Label>
                  <Input
                    id="discount_reason"
                    value={paymentData.discount_reason}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, discount_reason: e.target.value }))}
                    placeholder="Explique o motivo do desconto..."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('requirements')}>
          Voltar
        </Button>
        <Button
          onClick={handlePaymentNextStep}
          disabled={!paymentData.payment_method || (parseFloat(paymentData.discount_amount) > 0 && !paymentData.discount_reason)}
        >
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Sub-step 2: Confirmação e observações
  const renderPaymentStep2 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
        <h3 className="text-lg font-semibold mb-2">Confirmação do Pagamento - Etapa 2/2</h3>
        <p className="text-muted-foreground">
          {(paymentConfig?.stage === 'delivery' || paymentConfig?.stage === 'full' || nextStatus === 'completed' || nextStatus === 'delivered')
            ? 'Revise os dados. A ordem será concluída automaticamente após confirmar o pagamento.'
            : 'Revise os dados e confirme o recebimento'
          }
        </p>
      </div>

      {/* Resumo do pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Resumo do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Método:</span>
                <span className="font-medium">{paymentData.payment_method.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor Original:</span>
                <span>R$ {paymentConfig?.amount.toFixed(2)}</span>
              </div>
              {parseFloat(paymentData.discount_amount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto:</span>
                  <span>- R$ {paymentData.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Final:</span>
                <span className="text-green-600">R$ {calculateFinalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="payment_notes">Observações sobre o pagamento</Label>
            <Textarea
              id="payment_notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre o pagamento..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePaymentPreviousStep}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={handlePaymentConfirm}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? 'Confirmando...' :
            (paymentConfig?.stage === 'delivery' || paymentConfig?.stage === 'full' || nextStatus === 'completed' || nextStatus === 'delivered')
              ? 'Confirmar e Concluir Ordem'
              : 'Confirmar Pagamento'
          }
        </Button>
      </div>
    </div>
  );

  const renderQRCodeStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <QrCode className="h-12 w-12 mx-auto text-purple-500 mb-3" />
        <h3 className="text-lg font-semibold mb-2">Gerar QR Code de Rastreamento</h3>
        <p className="text-muted-foreground">
          Gere e imprima a etiqueta QR Code para rastrear este equipamento
        </p>
      </div>

      {/* Converter serviceOrder para o formato esperado pelo QRCodeGenerator */}
      {serviceOrder && (
        <QRCodeGenerator
          serviceOrder={{
            id: serviceOrder.id,
            orderNumber: (() => {
              // 🔧 PRODUÇÃO: Logs reduzidos para evitar problemas de performance
              try {
                const possibleOrderNumber =
                  serviceOrder.order_number ||
                  serviceOrder.orderNumber ||
                  serviceOrder['order-number'] ||
                  serviceOrder.os_number ||
                  null;

                return possibleOrderNumber || `OS #${serviceOrder.id.substring(0, 8).toUpperCase()}`;
              } catch (error) {
                console.error('❌ [StatusAdvanceDialog] Erro ao processar orderNumber:', error);
                return `OS #${serviceOrder.id.substring(0, 8).toUpperCase()}`;
              }
            })(),
            clientName: serviceOrder.client_name,
            clientEmail: '', // Não disponível neste contexto
            clientPhone: '', // Não disponível neste contexto
            clientCpfCnpj: '', // Não disponível neste contexto
            clientAddressComplement: '', // Não disponível neste contexto
            clientAddressReference: '', // Não disponível neste contexto
            technicianId: technicianId,
            technicianName: technicianName,
            status: serviceOrder.status as any,
            createdAt: new Date().toISOString(),
            scheduledDate: null,
            scheduledTime: '',
            completedDate: null,
            description: '',
            equipmentType: serviceOrder.equipment_type,
            equipmentModel: serviceOrder.equipment_model || null,
            equipmentSerial: serviceOrder.equipment_serial || null,
            needsPickup: true,
            pickupAddress: serviceOrder.pickup_address || null,
            pickupCity: null,
            pickupState: null,
            pickupZipCode: null,
            currentLocation: 'client',
            serviceAttendanceType: serviceOrder.service_attendance_type as any,
            clientDescription: '',
            images: [],
            serviceItems: [],
            finalCost: serviceOrder.final_cost,
            workshopId: null,
            workshopName: null
          }}
          onQRCodeGenerated={handleQRCodeGenerated}
        />
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('requirements')}>
          Voltar
        </Button>
        {qrCodeCompleted && (
          <Button onClick={() => {
            if (requiresPhoto && !photoCompleted) {
              setShowPhotoDialog(true);
            } else if (requiresPayment && !paymentCompleted) {
              setStep('payment');
            } else {
              setStep('confirm');
            }
          }}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Continuar
          </Button>
        )}
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    paymentStep === 1 ? renderPaymentStep1() : renderPaymentStep2()
  );

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
        <h3 className="text-lg font-semibold mb-2">Tudo Pronto!</h3>
        <p className="text-muted-foreground">
          Todos os requisitos foram cumpridos. Confirme para atualizar o status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo das Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requiresQRCode && (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">QR Code de rastreamento gerado</span>
            </div>
          )}

          {requiresPhoto && (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Foto do equipamento adicionada</span>
            </div>
          )}

          {requiresPayment && paymentConfig && (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <span className="text-sm">Pagamento confirmado</span>
                <p className="text-xs text-muted-foreground">
                  {paymentData.payment_method.toUpperCase()} - R$ {calculateFinalAmount().toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <ArrowRight className="h-5 w-5 text-blue-500" />
            <span className="text-sm">Status será atualizado para: <strong>{nextStatusLabel}</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('requirements')}>
          Voltar ao Início
        </Button>
        <Button
          onClick={handleFinalConfirm}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? 'Atualizando...' : `Confirmar: ${nextStatusLabel}`}
        </Button>
      </div>
    </div>
  );

  if (!serviceOrder) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Avançar para: {nextStatusLabel}
              {step === 'payment' && (
                <span className="text-sm text-muted-foreground ml-2">
                  - Etapa {paymentStep}/2
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da ordem */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informações da Ordem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cliente:</span> {serviceOrder.client_name}
                  </div>
                  <div>
                    <span className="font-medium">Equipamento:</span> {serviceOrder.equipment_type}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {
                      serviceOrder.service_attendance_type === 'coleta_diagnostico' ? 'Coleta Diagnóstico' :
                      serviceOrder.service_attendance_type === 'coleta_conserto' ? 'Coleta Conserto' :
                      serviceOrder.service_attendance_type === 'em_domicilio' ? 'Em Domicílio' :
                      serviceOrder.service_attendance_type
                    }
                  </div>
                  <div>
                    <span className="font-medium">Status Atual:</span> {
                      serviceOrder.status === 'on_the_way' ? 'A Caminho' :
                      serviceOrder.status === 'scheduled' ? 'Agendado' :
                      serviceOrder.status === 'in_progress' ? 'Em Andamento' :
                      serviceOrder.status === 'collected' ? 'Coletado' :
                      serviceOrder.status === 'at_workshop' ? 'Na Oficina' :
                      serviceOrder.status === 'completed' ? 'Concluído' :
                      serviceOrder.status
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Renderizar step atual */}
            {step === 'requirements' && renderRequirementsStep()}
            {step === 'qrcode' && renderQRCodeStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'confirm' && renderConfirmStep()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de foto reutilizado */}
      <PhotoCaptureDialog
        open={showPhotoDialog}
        onOpenChange={setShowPhotoDialog}
        orderId={serviceOrder?.id || ''}
        onSuccess={handlePhotoSuccess}
      />
    </>
  );
}
