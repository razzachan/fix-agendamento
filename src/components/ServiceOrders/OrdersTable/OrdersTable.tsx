import React, { useState, useEffect } from 'react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import EmptyOrdersState from './EmptyOrdersState';
import OrdersTableHeader from './OrdersTableHeader';
import OrdersTableRow from './OrdersTableRow';
import { Table, TableBody } from '@/components/ui/table';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { toast } from 'sonner';
import { hasOrderValue } from '@/utils/orderValue';
import OrderValue from '../OrderValue';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface OrdersTableProps {
  orders: ServiceOrder[];
  formatDate: (dateString: string) => string;
  onDeleteOrder?: (id: string) => Promise<boolean>;
  onUpdateOrderStatus?: (id: string, status: ServiceOrderStatus) => Promise<void>;
  onOrderClick?: (order: ServiceOrder) => void;
  sortConfig?: { key: keyof ServiceOrder | null; direction: 'ascending' | 'descending' | null };
  onSort?: (key: keyof ServiceOrder) => void;
  showAllColumns?: boolean;
  toggleColumnVisibility?: () => void;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  formatDate,
  onDeleteOrder,
  onUpdateOrderStatus,
  onOrderClick,
  sortConfig,
  onSort,
  showAllColumns,
  toggleColumnVisibility
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayedOrders, setDisplayedOrders] = useState<ServiceOrder[]>(orders);

  // Update displayed orders when orders change
  useEffect(() => {
    setDisplayedOrders(orders);
  }, [orders]);

  // Handler to open the archive confirmation dialog
  const handleArchiveClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  // Handler for when an order is clicked
  const handleOrderClick = (order: ServiceOrder) => {
    if (onOrderClick) {
      onOrderClick(order);
    }
  };

  // Handler to actually archive an order after confirmation
  const handleArchive = async () => {
    if (!orderToDelete || !onDeleteOrder) return;

    setIsDeleting(true);

    try {
      const success = await onDeleteOrder(orderToDelete);

      if (success) {
        // Remove the archived order from the displayed list
        setDisplayedOrders(prev => prev.filter(order => order.id !== orderToDelete));
        toast.success("Ordem arquivada com sucesso");
      } else {
        toast.error("Erro ao arquivar ordem");
      }
    } catch (error) {
      console.error(`Error archiving order ID ${orderToDelete}:`, error);
      toast.error("Erro ao arquivar ordem");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  // Handler for status updates on orders
  const handleStatusUpdate = async (orderId: string, status: ServiceOrderStatus): Promise<void> => {
    if (!onUpdateOrderStatus) {
      console.error("No status update handler provided");
      return Promise.resolve();
    }

    try {
      console.log(`OrdersTable: Updating status for order ${orderId} to ${status}`);

      // Call the parent's update function
      await onUpdateOrderStatus(orderId, status);

      // Update the UI immediately for better user experience
      setDisplayedOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status } : order
      ));

      console.log(`OrdersTable: Status updated successfully for order ${orderId}`);
    } catch (error) {
      console.error(`OrdersTable: Error updating status for order ${orderId}:`, error);
      toast.error("Erro ao atualizar status");
    }
  };

  // Render empty state if no orders
  if (displayedOrders.length === 0) {
    return <EmptyOrdersState />;
  }

  return (
    <>
      <div className="w-full">
        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {displayedOrders.map((order, index) => (
            <div
              key={order.id}
              className="bg-white border rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{order.clientName}</h3>
                  <p className="text-xs text-muted-foreground">{order.equipmentType}</p>
                </div>
                <DisplayNumber
                  item={order}
                  index={index}
                  variant="badge"
                  size="sm"
                  showIcon={true}
                />
              </div>

              {/* Valor da Ordem */}
              {hasOrderValue(order) && (
                <div className="mb-2">
                  <OrderValue order={order} size="sm" />
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {formatDate(order.createdAt)}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  {/* Status badge for mobile */}
                  <div className="text-xs px-2 py-1 rounded bg-gray-100">
                    {order.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <OrdersTableHeader
              onSort={onSort}
              sortConfig={sortConfig}
              showAllColumns={showAllColumns}
              toggleColumnVisibility={toggleColumnVisibility}
            />
            <TableBody>
              {displayedOrders.map((order, index) => (
                <OrdersTableRow
                  key={order.id}
                  order={order}
                  index={index}
                  formatDate={formatDate}
                  onArchiveOrder={handleArchiveClick}
                  onUpdateOrderStatus={handleStatusUpdate}
                  onClick={() => {
                    console.log(`🎯 OrdersTable: handleOrderClick chamado para ${order.clientName} (ID: ${order.id})`);
                    handleOrderClick(order);
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        setIsOpen={setDeleteDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleArchive}
      />
    </>
  );
};

export default OrdersTable;
