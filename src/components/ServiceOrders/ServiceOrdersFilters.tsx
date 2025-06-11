
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
    'scheduled', 'scheduled_collection', 'in_progress', 'completed', 'pending', 
    'cancelled', 'collected', 'collected_for_diagnosis',
    'at_workshop', 'diagnosis_completed', 'ready_for_delivery',
    'payment_pending', 'collected_for_delivery', 'on_the_way',
    'on_the_way_to_deliver'
  ];

  const getStatusLabel = (status: ServiceOrderStatus): string => {
    const labels: Record<ServiceOrderStatus, string> = {
      'scheduled': 'Agendado',
      'scheduled_collection': 'Coleta Agendada',
      'in_progress': 'Em andamento',
      'completed': 'Concluído',
      'pending': 'Pendente',
      'cancelled': 'Cancelado',
      'collected': 'Coletado',
      'collected_for_diagnosis': 'Coletado para diagnóstico',
      'at_workshop': 'Na oficina',
      'diagnosis_completed': 'Diagnóstico concluído',
      'ready_for_delivery': 'Pronto para entrega',
      'payment_pending': 'Pagamento pendente',
      'collected_for_delivery': 'Coletado para entrega',
      'on_the_way': 'À Caminho',
      'on_the_way_to_deliver': 'À Caminho para Entrega'
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
