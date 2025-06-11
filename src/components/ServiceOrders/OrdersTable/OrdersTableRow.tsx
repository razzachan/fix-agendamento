
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import LocationInfo from '../LocationInfo';
import StatusDropdown from './StatusDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OrderValue from '../OrderValue';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface OrdersTableRowProps {
  order: ServiceOrder;
  index: number;
  formatDate: (date: string) => string;
  onArchiveOrder?: (id: string) => void;
  onUpdateOrderStatus?: (id: string, status: ServiceOrderStatus) => Promise<void>;
  onClick?: () => void;
}

const OrdersTableRow: React.FC<OrdersTableRowProps> = ({
  order,
  index,
  formatDate,
  onArchiveOrder,
  onUpdateOrderStatus,
  onClick,
}) => {
  // Handle click on archive menu item
  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchiveOrder) {
      onArchiveOrder(order.id);
    }
  };

  // Handle click on the row
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Verificar se o clique foi em elementos que devem ser ignorados
    const isStatusDropdown = target.closest('.status-dropdown') ||
                            target.closest('[data-radix-collection-item]') ||
                            target.closest('[role="menuitem"]') ||
                            target.closest('[role="menu"]');

    const isActionDropdown = target.closest('.action-dropdown');

    if (isStatusDropdown || isActionDropdown) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
      onClick={handleRowClick}
      onMouseDown={handleRowClick}
      onPointerDown={handleRowClick}
      style={{ pointerEvents: 'auto' }}
      data-testid={`order-row-${order.id}`}
      data-order-id={order.id}
      data-client-name={order.clientName}
    >
      <TableCell className="text-center align-middle text-muted-foreground">
        <button
          onClick={handleRowClick}
          className="w-full h-full p-2 hover:bg-blue-50 rounded transition-colors"
          data-testid={`order-button-${order.id}`}
          title="Clique para ver detalhes da ordem"
        >
          <DisplayNumber
            item={order}
            index={index}
            variant="inline"
            size="sm"
            showIcon={true}
          />
        </button>
      </TableCell>
      <TableCell className="align-middle">
        <div>
          <div className="font-medium">{order.clientName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {order.clientPhone && (
              <>
                <span>{order.clientPhone}</span>
                <a
                  href={`https://wa.me/55${order.clientPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  WhatsApp
                </a>
              </>
            )}
          </div>
          {order.clientEmail && (
            <div className="text-xs text-muted-foreground">
              {order.clientEmail}
            </div>
          )}
          {order.clientCpfCnpj && (
            <div className="text-xs text-muted-foreground">
              CPF/CNPJ: {order.clientCpfCnpj}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <div>
          <div className="font-medium">{order.equipmentType}</div>
          {order.equipmentModel && (
            <div className="text-xs text-muted-foreground">
              Modelo: {order.equipmentModel}
            </div>
          )}
          <div className="text-xs text-muted-foreground line-clamp-1">
            {order.description.substring(0, 50)}{order.description.length > 50 ? '...' : ''}
          </div>
        </div>
      </TableCell>
      <TableCell className="align-middle">
        {formatDate(order.createdAt)}
      </TableCell>
      <TableCell
        className="text-center align-middle"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div
          className="status-dropdown"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <StatusDropdown
            status={order.status as ServiceOrderStatus}
            orderId={order.id}
            onUpdateStatus={onUpdateOrderStatus}
            serviceAttendanceType={order.serviceAttendanceType || 'em_domicilio'}
          />
        </div>
      </TableCell>
      <TableCell className="text-right align-middle">
        <div className="flex justify-end">
          <OrderValue order={order} size="sm" />
        </div>
      </TableCell>
      {order.technicianName && (
        <TableCell className="align-middle">
          {order.technicianName || 'Não atribuído'}
        </TableCell>
      )}
      {order.currentLocation && (
        <TableCell className="align-middle">
          <LocationInfo location={order.currentLocation} />
        </TableCell>
      )}
      <TableCell className="text-right align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="action-dropdown">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchiveOrder && (
                <DropdownMenuItem onClick={handleArchiveClick}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Arquivar</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default OrdersTableRow;
