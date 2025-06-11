import React from 'react';
import { ServiceOrder } from '@/types';
import OrderValue from './OrderValue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Exemplos de ordens para demonstração
const demoOrders: ServiceOrder[] = [
  {
    id: '1',
    clientName: 'João Silva',
    equipmentType: 'Micro-ondas',
    serviceAttendanceType: 'coleta_diagnostico',
    status: 'scheduled',
    finalCost: 250,
    createdAt: new Date().toISOString(),
    description: 'Micro-ondas não esquenta',
    clientPhone: '11999999999',
    clientEmail: 'joao@email.com'
  },
  {
    id: '2',
    clientName: 'Maria Santos',
    equipmentType: 'Geladeira',
    serviceAttendanceType: 'coleta_diagnostico',
    status: 'diagnosis_completed',
    finalCost: 450,
    createdAt: new Date().toISOString(),
    description: 'Geladeira não gela',
    clientPhone: '11888888888',
    clientEmail: 'maria@email.com'
  },
  {
    id: '3',
    clientName: 'Pedro Costa',
    equipmentType: 'Fogão',
    serviceAttendanceType: 'coleta_conserto',
    status: 'collected',
    finalCost: 300,
    createdAt: new Date().toISOString(),
    description: 'Fogão não acende',
    clientPhone: '11777777777',
    clientEmail: 'pedro@email.com'
  },
  {
    id: '4',
    clientName: 'Ana Oliveira',
    equipmentType: 'Máquina de Lavar',
    serviceAttendanceType: 'coleta_conserto',
    status: 'ready_for_delivery',
    finalCost: 400,
    createdAt: new Date().toISOString(),
    description: 'Máquina não centrifuga',
    clientPhone: '11666666666',
    clientEmail: 'ana@email.com'
  },
  {
    id: '5',
    clientName: 'Carlos Ferreira',
    equipmentType: 'Ar Condicionado',
    serviceAttendanceType: 'em_domicilio',
    status: 'in_progress',
    finalCost: 200,
    createdAt: new Date().toISOString(),
    description: 'Ar condicionado não gela',
    clientPhone: '11555555555',
    clientEmail: 'carlos@email.com'
  }
];

export const OrderValueDemo: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">💰 Demonstração da Lógica de Valores</h2>
        <p className="text-muted-foreground">
          Como os valores são exibidos baseado no tipo de atendimento e status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demoOrders.map((order) => (
          <Card key={order.id} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{order.clientName}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  #{order.id}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{order.equipmentType}</p>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Tipo de Atendimento */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">
                  {order.serviceAttendanceType === 'coleta_diagnostico' && 'Coleta Diagnóstico'}
                  {order.serviceAttendanceType === 'coleta_conserto' && 'Coleta Conserto'}
                  {order.serviceAttendanceType === 'em_domicilio' && 'Em Domicílio'}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{order.status}</span>
              </div>

              {/* Valor Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-medium">R$ {order.finalCost?.toFixed(2)}</span>
              </div>

              {/* Valor Contextual */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Exibido:</span>
                  <OrderValue order={order} size="sm" />
                </div>
              </div>

              {/* Explicação */}
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {order.serviceAttendanceType === 'coleta_diagnostico' && (
                  <>
                    {['scheduled', 'on_the_way', 'collected_for_diagnosis', 'at_workshop'].includes(order.status) && 
                      'Mostra R$ 350 (taxa de coleta)'
                    }
                    {['diagnosis_completed', 'ready_for_delivery', 'on_the_way_to_deliver'].includes(order.status) && 
                      'Mostra valor do orçamento'
                    }
                  </>
                )}
                {order.serviceAttendanceType === 'coleta_conserto' && (
                  <>
                    {['scheduled', 'on_the_way', 'collected', 'at_workshop'].includes(order.status) && 
                      'Mostra 50% do valor (coleta)'
                    }
                    {['ready_for_delivery', 'on_the_way_to_deliver'].includes(order.status) && 
                      'Mostra 50% restante (entrega)'
                    }
                  </>
                )}
                {order.serviceAttendanceType === 'em_domicilio' && 
                  'Mostra valor total (100% na conclusão)'
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Legenda dos Tipos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">🔧 Coleta Diagnóstico</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• R$ 350 na coleta</li>
                <li>• Valor do orçamento na entrega</li>
                <li>• Total = R$ 350 + orçamento</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">📦 Coleta Conserto</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 50% na coleta</li>
                <li>• 50% na entrega</li>
                <li>• Valor fixo conhecido</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">🏠 Em Domicílio</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 100% na conclusão</li>
                <li>• Pagamento único</li>
                <li>• Sem etapas</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>* Asterisco:</strong> Indica valor parcial baseado no status atual da ordem.
              Passe o mouse sobre o valor para ver detalhes completos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderValueDemo;
