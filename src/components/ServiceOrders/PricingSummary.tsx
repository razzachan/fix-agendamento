import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder } from '@/types';
import ServiceOrderPricingService from '@/services/serviceOrder/serviceOrderPricingService';
import { DollarSign, Calculator, CheckCircle, Clock } from 'lucide-react';

interface PricingSummaryProps {
  order: ServiceOrder;
  showDetails?: boolean;
}

const PricingSummary: React.FC<PricingSummaryProps> = ({
  order,
  showDetails = true
}) => {
  // Proteção contra valores undefined
  if (!order) {
    return <div className="text-muted-foreground">Dados não disponíveis</div>;
  }

  const pricing = ServiceOrderPricingService.getPricingSummary(order);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = () => {
    if (pricing.isPaid) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }

    if (order.serviceAttendanceType === 'coleta_diagnostico' && pricing.additionalCost === 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando Diagnóstico
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-red-50 text-red-700">
        <DollarSign className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-lg">
          {formatCurrency(pricing.finalCost)}
        </span>
        {getStatusBadge()}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Resumo Financeiro
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tipo de atendimento */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tipo de Atendimento:</span>
          <Badge variant="outline">
            {order.serviceAttendanceType === 'em_domicilio' && 'Em Domicílio'}
            {order.serviceAttendanceType === 'coleta_conserto' && 'Coleta Conserto'}
            {order.serviceAttendanceType === 'coleta_diagnostico' && 'Coleta Diagnóstico'}
          </Badge>
        </div>

        {/* Valores detalhados para coleta diagnóstico */}
        {order.serviceAttendanceType === 'coleta_diagnostico' && (
          <>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Valor Inicial (Sinal):</span>
                <span className="font-medium">{formatCurrency(pricing.initialCost)}</span>
              </div>
              
              {pricing.additionalCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Valor Adicional (Reparo):</span>
                  <span className="font-medium">{formatCurrency(pricing.additionalCost)}</span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-medium">Valor Total:</span>
                <span className="font-bold text-lg">{formatCurrency(pricing.finalCost)}</span>
              </div>
            </div>
          </>
        )}

        {/* Valores simples para outros tipos */}
        {order.serviceAttendanceType !== 'coleta_diagnostico' && (
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Valor Total:</span>
              <span className="font-bold text-lg">{formatCurrency(pricing.finalCost)}</span>
            </div>
          </div>
        )}

        {/* Descrição */}
        <div className="bg-muted/50 p-3 rounded-md">
          <p className="text-sm text-muted-foreground">{pricing.description}</p>
        </div>

        {/* Status específico para coleta diagnóstico */}
        {order.serviceAttendanceType === 'coleta_diagnostico' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${pricing.initialCost > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">
                Sinal {pricing.initialCost > 0 ? 'recebido' : 'pendente'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${pricing.additionalCost > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm">
                {pricing.additionalCost > 0 ? 'Orçamento aprovado' : 'Aguardando diagnóstico'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${pricing.isPaid ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">
                Pagamento {pricing.isPaid ? 'concluído' : 'pendente'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingSummary;
