
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ServiceOrder } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, Search } from 'lucide-react';

interface WorkshopOrdersListProps {
  orders: ServiceOrder[];
}

const WorkshopOrdersList: React.FC<WorkshopOrdersListProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at_workshop':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'payment_pending':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'collected_for_delivery':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collected':
        return 'Coletado';
      case 'at_workshop':
        return 'Na Oficina';
      case 'in_progress':
        return 'Em Reparo';
      case 'payment_pending':
        return 'Aguardando Pagamento';
      case 'collected_for_delivery':
        return 'Pronto para Entrega';
      default:
        return status;
    }
  };
  
  const getAttendanceTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'em_domicilio':
        return 'Visita domiciliar';
      case 'coleta_conserto':
        return 'Coleta para conserto';
      case 'coleta_diagnostico':
        return 'Coleta para diagnóstico';
      default:
        return 'Não especificado';
    }
  };

  // Filter orders based on search query
  const filteredOrders = orders.filter(order =>
    order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.equipmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, equipamento ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Tipo de Atendimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.clientName}
                  </TableCell>
                  <TableCell>{order.equipmentType}</TableCell>
                  <TableCell>
                    {getAttendanceTypeLabel(order.serviceAttendanceType)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" className="h-8 w-8 p-0" asChild>
                      <Link to={`/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-2">Nenhuma ordem de serviço encontrada</p>
          <p className="text-sm text-muted-foreground">
            Tente ajustar sua busca ou verifique se há ordens de serviço nesta oficina.
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkshopOrdersList;
