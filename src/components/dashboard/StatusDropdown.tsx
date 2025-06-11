
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Clock, Calendar, Wrench, Truck, 
  Package, Building, CreditCard, ClipboardList, X,
  ChevronDown 
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface StatusDropdownProps {
  serviceOrders: any[];
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ serviceOrders }) => {
  const statusConfigs = [
    { status: 'pending', label: 'Em Aberto', icon: Clock, bgColor: 'bg-yellow-50', textColor: 'text-yellow-800' },
    { status: 'scheduled', label: 'Agendados', icon: Calendar, bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
    { status: 'in_progress', label: 'Em Andamento', icon: Wrench, bgColor: 'bg-purple-50', textColor: 'text-purple-800' },
    { status: 'on_the_way', label: 'À Caminho', icon: Truck, bgColor: 'bg-indigo-50', textColor: 'text-indigo-800' },
    { status: 'collected', label: 'Coletados', icon: Package, bgColor: 'bg-teal-50', textColor: 'text-teal-800' },
    { status: 'at_workshop', label: 'Na Oficina', icon: Building, bgColor: 'bg-amber-50', textColor: 'text-amber-800' },
    { status: 'collected_for_delivery', label: 'Coletado para Entrega', icon: Package, bgColor: 'bg-green-50', textColor: 'text-green-800' },
    { status: 'payment_pending', label: 'Pagamento Pendente', icon: CreditCard, bgColor: 'bg-orange-50', textColor: 'text-orange-800' },
    { status: 'completed', label: 'Concluídos', icon: ClipboardList, bgColor: 'bg-green-50', textColor: 'text-green-800' },
    { status: 'cancelled', label: 'Cancelados', icon: X, bgColor: 'bg-red-50', textColor: 'text-red-800' },
  ];

  const totalOrders = serviceOrders.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          Status das Ordens <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        {statusConfigs.map((config) => {
          const count = serviceOrders.filter(order => order.status === config.status).length;
          const Icon = config.icon;
          
          return (
            <DropdownMenuItem key={config.status} className="flex items-center justify-between p-3">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                config.bgColor,
                config.textColor
              )}>
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </div>
              <span className="font-medium">{count}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem className="border-t mt-2 p-3">
          <div className="w-full flex justify-between font-medium">
            <span>Total de Ordens:</span>
            <span>{totalOrders}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusDropdown;
