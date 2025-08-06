import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Link, 
  Unlink,
  Eye,
  DollarSign,
  Calendar,
  User,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import { OrderRelationshipService } from '@/services/orderRelationshipService';
import { formatCurrency } from '@/utils/financialCalculations';
import { toast } from 'sonner';

interface OrderRelationshipViewProps {
  orderId: string;
  onOrderSelect?: (orderId: string) => void;
}

const OrderRelationshipView: React.FC<OrderRelationshipViewProps> = ({
  orderId,
  onOrderSelect
}) => {
  const [orderHistory, setOrderHistory] = useState<{
    parentOrder?: ServiceOrder;
    currentOrder: ServiceOrder;
    childOrders: ServiceOrder[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadOrderHistory = async () => {
    setIsLoading(true);
    try {
      const history = await OrderRelationshipService.getOrderHistory(orderId);
      setOrderHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar relacionamentos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadOrderHistory();
    }
  }, [orderId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-orange-100 text-orange-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'at_workshop': 'bg-purple-100 text-purple-800',
      'budget_approved': 'bg-indigo-100 text-indigo-800',
      'payment_pending': 'bg-amber-100 text-amber-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOrderTypeIcon = (orderType?: string) => {
    switch (orderType) {
      case 'parent':
        return <Wrench className="w-4 h-4" />;
      case 'child':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando relacionamentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderHistory) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Não foi possível carregar os relacionamentos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { parentOrder, currentOrder, childOrders } = orderHistory;
  const familyTotal = OrderRelationshipService.calculateFamilyTotal(parentOrder, childOrders);
  const hasRelationships = parentOrder || childOrders.length > 0;

  return (
    <div className="space-y-4">
      {/* Resumo da Família */}
      {hasRelationships && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Resumo da Família de Ordens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <p className="text-sm text-muted-foreground">Valor Inicial Total</p>
                <p className="text-lg font-bold">{formatCurrency(familyTotal.totalInitial)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-sm text-muted-foreground">Valor Final Total</p>
                <p className="text-lg font-bold">{formatCurrency(familyTotal.totalFinal)}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-lg font-bold">{formatCurrency(familyTotal.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ordem Pai */}
      {parentOrder && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Ordem Pai (Diagnóstico)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">#{parentOrder.id.slice(0, 8)}</p>
                <p className="text-sm text-muted-foreground">{parentOrder.clientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(parentOrder.status)}>
                  {parentOrder.status}
                </Badge>
                {onOrderSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOrderSelect(parentOrder.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Equipamento:</p>
                <p>{parentOrder.equipmentType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atendimento:</p>
                <p>{parentOrder.serviceAttendanceType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Inicial:</p>
                <p>{formatCurrency(parentOrder.initialCost || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Final:</p>
                <p>{formatCurrency(parentOrder.finalCost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ordem Atual */}
      <Card className={`border-2 ${currentOrder.id === orderId ? 'border-orange-300 bg-orange-50' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getOrderTypeIcon(currentOrder.orderType)}
            Ordem Atual
            {currentOrder.id === orderId && (
              <Badge variant="outline" className="ml-2">Selecionada</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">#{currentOrder.id.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">{currentOrder.clientName}</p>
            </div>
            <Badge className={getStatusColor(currentOrder.status)}>
              {currentOrder.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Equipamento:</p>
              <p>{currentOrder.equipmentType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Atendimento:</p>
              <p>{currentOrder.serviceAttendanceType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Inicial:</p>
              <p>{formatCurrency(currentOrder.initialCost || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Final:</p>
              <p>{formatCurrency(currentOrder.finalCost || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ordens Filhas */}
      {childOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Ordens Filhas (Consertos)
          </h3>
          {childOrders.map((childOrder) => (
            <Card key={childOrder.id} className="border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">#{childOrder.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{childOrder.clientName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(childOrder.status)}>
                      {childOrder.status}
                    </Badge>
                    {onOrderSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOrderSelect(childOrder.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Atendimento:</p>
                    <p>{childOrder.serviceAttendanceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor:</p>
                    <p>{formatCurrency(childOrder.finalCost || childOrder.initialCost || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sem Relacionamentos */}
      {!hasRelationships && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Unlink className="w-8 h-8 mx-auto mb-2" />
              <p>Esta ordem não possui relacionamentos</p>
              <p className="text-sm">É uma ordem independente</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderRelationshipView;
