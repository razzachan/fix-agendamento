
import React from 'react';
import { Input } from '@/components/ui/input';
import { ServiceOrderStatus } from '@/types';
import { ServiceOrdersFilters } from '@/components/ServiceOrders';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: ServiceOrderStatus[];
  handleStatusFilterChange: (status: ServiceOrderStatus) => void;
  handleSelectAllStatuses?: () => void;
  handleDeselectAllStatuses?: () => void;
}

const SearchSection = ({
  searchQuery,
  setSearchQuery,
  filterStatus,
  handleStatusFilterChange,
  handleSelectAllStatuses,
  handleDeselectAllStatuses
}: SearchSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div className="md:col-span-3">
        <Input
          type="search"
          placeholder="Buscar por cliente, equipamento ou OS..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div>
        <ServiceOrdersFilters
          filterStatus={filterStatus}
          onStatusFilterChange={handleStatusFilterChange}
          onSelectAll={handleSelectAllStatuses}
          onDeselectAll={handleDeselectAllStatuses}
        />
      </div>
    </div>
  );
};

export default SearchSection;
