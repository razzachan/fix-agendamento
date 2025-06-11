
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServiceOrder, ServiceOrderStatus } from '@/types';

export const useServiceOrdersState = (serviceOrders: ServiceOrder[]) => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ServiceOrderStatus[]>([
    'scheduled', 'in_progress', 'completed', 'pending', 'cancelled',
    'scheduled_collection', 'collected', 'at_workshop',
    'collected_for_diagnosis', 'diagnosis_completed', 'ready_for_delivery',
    'collected_for_delivery', 'payment_pending', 'on_the_way', 
    'on_the_way_to_deliver'
  ]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ServiceOrder | null;
    direction: 'ascending' | 'descending' | null;
  }>({
    key: null,
    direction: null,
  });

  const handleOrderClick = (order: ServiceOrder) => {
    console.log(`🎯 Navegando para ordem: ${order.id}`);
    navigate(`/orders/${order.id}`);
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
    setIsTracking(false);
  };

  const handleTrackingClick = () => {
    setIsTracking(true);
  };

  const handleStatusFilterChange = (status: ServiceOrderStatus) => {
    setFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleSelectAllStatuses = () => {
    const allStatuses: ServiceOrderStatus[] = [
      'scheduled', 'scheduled_collection', 'in_progress', 'completed', 'pending',
      'cancelled', 'collected', 'collected_for_diagnosis',
      'at_workshop', 'diagnosis_completed', 'ready_for_delivery',
      'payment_pending', 'collected_for_delivery', 'on_the_way',
      'on_the_way_to_deliver'
    ];
    setFilterStatus(allStatuses);
  };

  const handleDeselectAllStatuses = () => {
    setFilterStatus([]);
  };

  const toggleColumnVisibility = () => {
    setShowAllColumns(!showAllColumns);
  };

  const handleSort = (key: keyof ServiceOrder) => {
    let direction: 'ascending' | 'descending' | null = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = null;
      key = null as any;
    }
    setSortConfig({ key, direction });
  };

  const sortOrders = useCallback((orders: ServiceOrder[]) => {
    if (!sortConfig.key) {
      return orders;
    }

    return [...orders].sort((a, b) => {
      const direction = sortConfig.direction === 'ascending' ? 1 : -1;
      const valueA = a[sortConfig.key!];
      const valueB = b[sortConfig.key!];

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [sortConfig]);

  const filteredOrders = serviceOrders.filter(order => {
    const matchesSearch =
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.equipmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus.includes(order.status);

    return matchesSearch && matchesStatus;
  });

  const sortedOrders = sortOrders(filteredOrders);

  return {
    selectedOrder,
    isTracking,
    searchQuery,
    setSearchQuery,
    showAllColumns,
    filterStatus,
    sortConfig,
    handleOrderClick,
    handleBackToList,
    handleTrackingClick,
    handleStatusFilterChange,
    handleSelectAllStatuses,
    handleDeselectAllStatuses,
    toggleColumnVisibility,
    handleSort,
    sortedOrders,
  };
};
