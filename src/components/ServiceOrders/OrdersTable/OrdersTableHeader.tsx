
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronDown, ChevronUp, Columns2 } from 'lucide-react';

interface OrdersTableHeaderProps {
  onSort?: (key: keyof ServiceOrder) => void;
  sortConfig?: {
    key: keyof ServiceOrder | null;
    direction: 'ascending' | 'descending' | null
  };
  showAllColumns?: boolean;
  toggleColumnVisibility?: () => void;
}

const OrdersTableHeader: React.FC<OrdersTableHeaderProps> = ({
  onSort,
  sortConfig,
  showAllColumns = false,
  toggleColumnVisibility
}) => {
  const getSortIcon = (key: keyof ServiceOrder) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-3 w-3 ml-1" />;
    }
    return sortConfig.direction === 'ascending' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  const handleSort = (key: keyof ServiceOrder) => {
    if (onSort) {
      onSort(key);
    }
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12 text-center">#</TableHead>
        <TableHead className="min-w-[250px]">
          <div className="flex items-center cursor-pointer" onClick={() => handleSort('clientName')}>
            Cliente {getSortIcon('clientName')}
          </div>
        </TableHead>
        <TableHead className="min-w-[200px]">
          <div className="flex items-center cursor-pointer" onClick={() => handleSort('equipmentType')}>
            Equipamento {getSortIcon('equipmentType')}
          </div>
        </TableHead>
        <TableHead>
          <div className="flex items-center cursor-pointer" onClick={() => handleSort('createdAt')}>
            Data {getSortIcon('createdAt')}
          </div>
        </TableHead>
        <TableHead className="text-center">Status</TableHead>
        <TableHead className="text-right">
          <div className="flex items-center justify-end cursor-pointer" onClick={() => handleSort('finalCost')}>
            Valor {getSortIcon('finalCost')}
          </div>
        </TableHead>
        {showAllColumns && (
          <>
            <TableHead>Técnico</TableHead>
            <TableHead>Local</TableHead>
          </>
        )}
        <TableHead className="text-right">
          {toggleColumnVisibility && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleColumnVisibility}
              title={showAllColumns ? "Mostrar menos colunas" : "Mostrar mais colunas"}
            >
              <Columns2 className="h-4 w-4" />
            </Button>
          )}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default OrdersTableHeader;
