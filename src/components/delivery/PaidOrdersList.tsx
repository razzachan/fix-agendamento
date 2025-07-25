import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, MapPin, RefreshCw, CheckCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliverySchedulingDialog } from './DeliverySchedulingDialog';
import { AlertBadge, useAlertType, useDaysOverdue } from '@/components/ui/AlertBadge';
import { toast } from 'sonner';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';

interface PaidOrder {
  id: string;
  client_name: string;
  client_phone: string;
  pickup_address: string;
  equipment_type: string;
  equipment_model?: string;
  service_attendance_type: string;
  status: string;
  created_at: string;
  current_location: string;
  payment_info?: {
    amount: number;
    final_amount: number;
    payment_method: string;
    payment_date: string;
  };
}

export function PaidOrdersList() {
  const [orders, setOrders] = useState<PaidOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PaidOrder | null>(null);
  const [showSchedulingDialog, setShowSchedulingDialog] = useState(false);

  const loadPaidOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          client_name,
          client_phone,
          pickup_address,
          equipment_type,
          equipment_model,
          service_attendance_type,
          status,
          created_at,
          current_location,
          payments (
            amount,
            final_amount,
            payment_method,
            payment_date
          )
        `)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar equipamentos pagos:', error);
        throw error;
      }

      const ordersWithPayment = (data || []).map(order => ({
        ...order,
        payment_info: order.payments?.[0] || null
      }));

      setOrders(ordersWithPayment);
    } catch (error) {
      console.error('❌ Erro ao carregar equipamentos pagos:', error);
      toast.error('Erro ao carregar equipamentos pagos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaidOrders();
  }, []);

  const handleScheduleDelivery = (order: PaidOrder) => {
    setSelectedOrder(order);
    setShowSchedulingDialog(true);
  };

  const handleScheduleSuccess = () => {
    loadPaidOrders();
    toast.success('Entrega agendada com sucesso!');
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Diagnóstico</Badge>;
      case 'coleta_conserto':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Conserto</Badge>;
      case 'em_domicilio':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Domicílio</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'pix': 'PIX',
      'transferencia': 'Transferência',
      'cheque': 'Cheque'
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Equipamentos Pagos - Prontos para Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando equipamentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Equipamentos Pagos - Prontos para Agendamento
              {orders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {orders.length}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPaidOrders}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum equipamento pago aguardando agendamento
              </h3>
              <p className="text-gray-600">
                Quando os pagamentos forem confirmados, os equipamentos aparecerão aqui para agendamento de entrega.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="border rounded-lg p-4 space-y-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {order.client_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.equipment_type}
                          {order.equipment_model && ` - ${order.equipment_model}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Badge de alerta inteligente */}
                      {(() => {
                        const alertType = useAlertType(order);
                        const daysOverdue = useDaysOverdue(order);

                        if (alertType) {
                          return (
                            <AlertBadge
                              type={alertType}
                              daysOverdue={daysOverdue}
                              size="md"
                            />
                          );
                        }
                        return null;
                      })()}

                      {getServiceTypeBadge(order.service_attendance_type)}
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pago
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Informações do pagamento */}
                  {order.payment_info && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Informações do Pagamento
                      </h5>
                      <div className="grid grid-cols-3 gap-4 text-sm text-green-700">
                        <div>
                          <span className="font-medium">Valor Pago:</span>
                          <p>R$ {order.payment_info.final_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Método:</span>
                          <p>{getPaymentMethodLabel(order.payment_info.payment_method)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Data:</span>
                          <p>{formatDate(order.payment_info.payment_date)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Informações do cliente */}
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Telefone:</span>
                      <p>{order.client_phone}</p>
                    </div>
                    <div>
                      <span className="font-medium">Localização:</span>
                      <p>{order.current_location === 'workshop' ? 'Oficina' : order.current_location}</p>
                    </div>
                    <div>
                      <span className="font-medium">Reparado em:</span>
                      <p>{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  
                  {/* Endereço */}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3" />
                      Endereço de Entrega:
                    </span>
                    <AddressDisplay
                      data={extractAddressFromServiceOrder(order)}
                      variant="compact"
                      showIcon={false}
                      className="ml-4"
                    />
                  </div>
                  
                  {/* Botão de ação */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleScheduleDelivery(order)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Agendar Entrega
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de agendamento */}
      <DeliverySchedulingDialog
        open={showSchedulingDialog}
        onOpenChange={setShowSchedulingDialog}
        serviceOrder={selectedOrder}
        onScheduleSuccess={handleScheduleSuccess}
      />
    </>
  );
}
