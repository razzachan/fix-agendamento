
import React from 'react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FilterIcon, CheckSquare, Square } from "lucide-react";

interface ServiceOrdersFiltersProps {
  filterStatus: ServiceOrderStatus[];
  onStatusFilterChange: (status: ServiceOrderStatus) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

// Convert this from a function that returns data to a React component
const ServiceOrdersFilters: React.FC<ServiceOrdersFiltersProps> = ({
  filterStatus,
  onStatusFilterChange,
  onSelectAll,
  onDeselectAll
}) => {
  // Updated to match the ServiceOrderStatus type exactly
  const allStatuses: ServiceOrderStatus[] = [
    'pending', 'scheduled', 'scheduled_collection', 'in_progress', 'on_the_way',
    'collected', 'collected_for_diagnosis', 'at_workshop', 'received_at_workshop',
    'diagnosis_completed', 'quote_sent', 'awaiting_quote_approval', 'quote_approved',
    'quote_rejected', 'ready_for_return', 'needs_workshop', 'ready_for_delivery',
    'delivery_scheduled', 'collected_for_delivery', 'on_the_way_to_deliver',
    'payment_pending', 'completed', 'cancelled'
  ];

  const getStatusLabel = (status: ServiceOrderStatus): string => {
    const labels: Record<ServiceOrderStatus, string> = {
      'pending': 'Pendente',
      'scheduled': 'Agendado',
      'scheduled_collection': 'Coleta Agendada',
      'in_progress': 'Em andamento',
      'on_the_way': 'À Caminho',
      'collected': 'Coletado',
      'collected_for_diagnosis': 'Coletado para diagnóstico',
      'at_workshop': 'Na oficina',
      'received_at_workshop': 'Recebido na oficina',
      'diagnosis_completed': 'Diagnóstico concluído',
      'quote_sent': 'Orçamento enviado',
      'awaiting_quote_approval': 'Aguardando aprovação do orçamento',
      'quote_approved': 'Orçamento aprovado',
      'quote_rejected': 'Orçamento rejeitado',
      'ready_for_return': 'Pronto para devolução',
      'needs_workshop': 'Precisa de oficina',
      'ready_for_delivery': 'Pronto para entrega',
      'delivery_scheduled': 'Entrega agendada',
      'collected_for_delivery': 'Coletado para entrega',
      'on_the_way_to_deliver': 'À Caminho para Entrega',
      'payment_pending': 'Pagamento pendente',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          <FilterIcon className="h-4 w-4 mr-2" />
          Filtros
          {filterStatus.length < allStatuses.length && (
            <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
              {filterStatus.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Opções de Marcar/Desmarcar Todos */}
        <div className="p-1">
          <DropdownMenuItem
            onClick={onSelectAll}
            className="flex items-center gap-2 cursor-pointer hover:bg-green-50 hover:text-green-700"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="font-medium">Marcar Todos</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDeselectAll}
            className="flex items-center gap-2 cursor-pointer hover:bg-red-50 hover:text-red-700"
          >
            <Square className="h-4 w-4" />
            <span className="font-medium">Desmarcar Todos</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        {/* Lista de Status */}
        <div className="max-h-64 overflow-y-auto">
          {allStatuses.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filterStatus.includes(status)}
              onCheckedChange={() => onStatusFilterChange(status)}
              className="text-sm"
            >
              {getStatusLabel(status)}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ServiceOrdersFilters;
