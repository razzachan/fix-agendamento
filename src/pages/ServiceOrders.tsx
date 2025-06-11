
import React, { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import ServiceOrdersHeader from './ServiceOrders/components/ServiceOrdersHeader';
import SearchSection from './ServiceOrders/components/SearchSection';
import ServiceOrderContent from './ServiceOrders/components/ServiceOrderContent';
import SimpleMobileView from '@/components/ServiceOrders/SimpleMobileView';
import { useServiceOrdersState } from './ServiceOrders/hooks/useServiceOrdersState';
import { ServiceOrderStatus } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBadgeFilters } from '@/hooks/useBadgeFilters';
import { BadgeFilterBanner } from '@/components/ui/badge-filter-banner';
import { useLocation } from 'react-router-dom';
import { DisplayNumber } from '@/components/common/DisplayNumber';

const ServiceOrdersPage: React.FC = () => {
  const location = useLocation();

  // Verificar se há parâmetros de query para ordem específica
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId');
  const isMobileParam = searchParams.get('mobile') === 'true';

  console.log('🔍 ServiceOrders: Query params:', { orderId, isMobileParam });

  // VERIFICAÇÃO IMEDIATA DE MOBILE ANTES DE QUALQUER COISA
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(userAgent);
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  const isTouchDevice = typeof window !== 'undefined' ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false;

  // Verificar se está sendo carregado dentro de um iframe
  const isInIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  // Se tem orderId, está em iframe, ou mobile=true, não redirecionar - mostrar a ordem
  if (!orderId && !isInIframe && !isMobileParam && (isMobileUA || isSmallScreen || isTouchDevice)) {
    console.log('📱 Mobile detected at component start - Redirecting');
    if (typeof window !== 'undefined') {
      window.location.replace('/mobile-orders.html');
    }
  }

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // SOLUÇÃO DE EMERGÊNCIA: Detecção robusta de mobile com redirecionamento imediato
  useEffect(() => {
    const checkAndRedirectMobile = () => {
      // Verificar se está em iframe - se sim, não redirecionar
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        console.log('📱 Detectado iframe - não redirecionando');
        setIsMobile(false);
        return false;
      }

      // Verificar se tem orderId ou mobile=true - se sim, não redirecionar
      if (orderId || isMobileParam) {
        console.log('📱 Detectado orderId ou mobile=true - não redirecionando');
        setIsMobile(false);
        return false;
      }

      // Múltiplas verificações de mobile
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Verificações adicionais
      const isAndroid = /android/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isWindowsPhone = /windows phone/.test(userAgent);

      const isMobileDetected = isMobileUA || isSmallScreen || isTouchDevice || isAndroid || isIOS || isWindowsPhone;

      console.log('📱 Mobile detection:', { isMobileDetected, isInIframe, orderId, isMobileParam });

      if (isMobileDetected) {
        console.log('📱 Mobile detected - Redirecting to mobile version');

        // Redirecionamento imediato e forçado
        try {
          window.location.replace('/mobile-orders.html');
        } catch (error) {
          console.error('Erro no replace, tentando href:', error);
          window.location.href = '/mobile-orders.html';
        }

        // Parar execução do resto do componente
        return true;
      }

      setIsMobile(false);
      return false;
    };

    // Executar imediatamente
    const redirected = checkAndRedirectMobile();

    if (!redirected) {
      // Só adicionar listener se não redirecionou
      window.addEventListener('resize', checkAndRedirectMobile);
      return () => window.removeEventListener('resize', checkAndRedirectMobile);
    }
  }, [orderId, isMobileParam]);

  // Tentar carregar dados de forma mais segura com logs detalhados
  let serviceOrders, isLoading, refreshServiceOrders, updateServiceOrder;

  try {
    console.log('🔄 ServiceOrders: Iniciando carregamento de dados...');
    const appData = useAppData();
    console.log('✅ ServiceOrders: useAppData executado com sucesso:', appData);

    serviceOrders = appData.serviceOrders;
    isLoading = appData.isLoading;
    refreshServiceOrders = appData.refreshServiceOrders;
    updateServiceOrder = appData.updateServiceOrder;

    console.log('📊 ServiceOrders: Dados extraídos:', {
      serviceOrdersCount: serviceOrders?.length || 0,
      isLoading,
      hasRefreshFunction: !!refreshServiceOrders,
      hasUpdateFunction: !!updateServiceOrder
    });

    if (!isInitialized) {
      console.log('✅ ServiceOrders: Inicialização concluída com sucesso');
      setIsInitialized(true);
    }
  } catch (error) {
    console.error('❌ ServiceOrders: ERRO CRÍTICO ao carregar useAppData:', error);
    console.error('❌ Stack trace:', error.stack);
    setHasError(true);
    setErrorMessage(`Erro ao carregar dados: ${error.message}`);
  }

  const [refreshKey, setRefreshKey] = useState(0);

  // Hook para filtros de badge
  const { activeFilter, clearBadgeFilter, getBadgeFilterSQL, isFilterActive } = useBadgeFilters();

  // Aplicar filtro de badge aos dados se ativo
  const getFilteredOrders = (orders: any[]) => {
    if (!isFilterActive || !activeFilter) return orders;

    const today = new Date().toISOString().split('T')[0];

    // Datas para comparação de atrasos
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    switch (activeFilter.filterKey) {
      case 'urgent_orders':
        return orders.filter(order => {
          // 1. Ordens pendentes há mais de 24h (CRÍTICO)
          if (order.status === 'pending') {
            const createdAt = new Date(order.createdAt);
            return createdAt <= oneDayAgo;
          }

          // 2. Ordens agendadas para hoje ou atrasadas (URGENTE)
          if (order.status === 'scheduled' && order.scheduledDate) {
            const scheduledDate = new Date(order.scheduledDate).toISOString().split('T')[0];
            return scheduledDate <= today;
          }

          // 3. Ordens em andamento há mais de 3 dias (possível atraso)
          if (order.status === 'in_progress') {
            const updatedAt = new Date(order.updatedAt || order.createdAt);
            return updatedAt <= threeDaysAgo;
          }

          // 4. Ordens na oficina há mais de 7 dias (atraso significativo)
          if (order.status === 'at_workshop') {
            const updatedAt = new Date(order.updatedAt || order.createdAt);
            return updatedAt <= sevenDaysAgo;
          }

          return false;
        });

      default:
        return orders;
    }
  };

  // Error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('JavaScript error caught:', error);
      setHasError(true);
      setErrorMessage(error.message || 'Erro desconhecido');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setHasError(true);
      setErrorMessage('Erro de carregamento');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Usar hook de forma mais segura
  let serviceOrdersState;
  try {
    serviceOrdersState = useServiceOrdersState(serviceOrders || []);

    // Se há orderId na URL, selecionar automaticamente
    if (orderId && serviceOrders && serviceOrders.length > 0) {
      const targetOrder = serviceOrders.find(order => order.id === orderId);
      if (targetOrder) {
        console.log('🎯 ServiceOrders: Auto-selecionando ordem:', orderId);
        // Forçar seleção da ordem
        serviceOrdersState.selectedOrder = targetOrder;
      }
    }
  } catch (error) {
    console.error('ServiceOrders: Erro no useServiceOrdersState:', error);
    setHasError(true);
    setErrorMessage('Erro ao processar ordens de serviço');
    serviceOrdersState = {
      selectedOrder: null,
      isTracking: false,
      searchQuery: '',
      setSearchQuery: () => {},
      showAllColumns: false,
      filterStatus: 'all',
      sortConfig: { key: null, direction: null },
      handleOrderClick: () => {},
      handleBackToList: () => {},
      handleTrackingClick: () => {},
      handleStatusFilterChange: () => {},
      toggleColumnVisibility: () => {},
      handleSort: () => {},
      sortedOrders: [],
    };
  }

  const {
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
  } = serviceOrdersState;

  // Aplicar filtro de badge aos dados ordenados
  const finalSortedOrders = getFilteredOrders(sortedOrders);

  // Atualizar contagem no filtro ativo
  if (isFilterActive && activeFilter) {
    activeFilter.count = finalSortedOrders.length;
  }

  // Update the imported formatDate to match the expected signature
  const formatDateString = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Função para forçar a atualização dos dados
  const handleDataRefresh = async () => {
    console.log('ServiceOrdersPage: Forcing data refresh');
    await refreshServiceOrders();
    setRefreshKey(prev => prev + 1);
    console.log('ServiceOrdersPage: Data refresh complete, new refresh key:', refreshKey + 1);
  };

  // Add an explicit handler for status updates - SISTEMA ROBUSTO
  const handleUpdateOrderStatus = async (orderId: string, status: ServiceOrderStatus): Promise<void> => {
    console.log(`🔄 [ServiceOrdersPage] EXECUTANDO - Updating order ${orderId} to status ${status}`);

    try {
      // VALIDAÇÃO PRÉVIA
      if (!orderId || !status) {
        console.error(`❌ [ServiceOrdersPage] Parâmetros inválidos:`, { orderId, status });
        toast.error("Parâmetros inválidos para atualização");
        return Promise.reject(new Error("Invalid parameters"));
      }

      if (!updateServiceOrder) {
        console.error(`❌ [ServiceOrdersPage] updateServiceOrder function não disponível`);
        toast.error("Função de atualização não disponível");
        return Promise.reject(new Error("Update function not available"));
      }

      console.log(`🔄 [ServiceOrdersPage] Chamando updateServiceOrder...`);

      // SISTEMA ROBUSTO - Múltiplas tentativas
      let success = false;
      let lastError = null;

      // Tentativa 1: Atualização normal
      try {
        success = await updateServiceOrder(orderId, { status });
        console.log(`✅ [ServiceOrdersPage] Tentativa 1 - Resultado:`, success);
      } catch (error1) {
        console.error(`❌ [ServiceOrdersPage] Tentativa 1 falhou:`, error1);
        lastError = error1;

        // Tentativa 2: Aguardar e tentar novamente
        try {
          console.log(`🔄 [ServiceOrdersPage] Tentativa 2 - Aguardando 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          success = await updateServiceOrder(orderId, { status });
          console.log(`✅ [ServiceOrdersPage] Tentativa 2 - Resultado:`, success);
        } catch (error2) {
          console.error(`❌ [ServiceOrdersPage] Tentativa 2 falhou:`, error2);
          lastError = error2;

          // Tentativa 3: REMOVIDA - Não usar atualização direta no banco
          // Isso bypassa o sistema de notificações automáticas
          console.error(`❌ [ServiceOrdersPage] Todas as tentativas falharam - não usando fallback direto no banco`);
          console.error(`❌ [ServiceOrdersPage] Último erro:`, lastError);
        }
      }

      if (success) {
        console.log(`✅ [ServiceOrdersPage] Status atualizado com sucesso: ${orderId} → ${status}`);
        toast.success(`Status atualizado para ${status}`);

        // Force refresh to update the UI with the new data
        try {
          await handleDataRefresh();
          console.log(`✅ [ServiceOrdersPage] Refresh dos dados concluído`);
        } catch (refreshError) {
          console.error(`❌ [ServiceOrdersPage] Erro no refresh:`, refreshError);
          // Não falhar por causa do refresh
        }

        return Promise.resolve();
      } else {
        console.error(`❌ [ServiceOrdersPage] Todas as tentativas falharam. Último erro:`, lastError);
        toast.error("Falha ao atualizar status após múltiplas tentativas");
        return Promise.reject(lastError || new Error("Update failed"));
      }
    } catch (error) {
      console.error(`❌ [ServiceOrdersPage] Erro geral ao atualizar ordem ${orderId}:`, error);
      toast.error("Erro ao atualizar status");
      return Promise.reject(error);
    }
  };

  // Error fallback component
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold">Erro ao carregar página</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || 'Ocorreu um erro inesperado'}
                </p>
              </div>
              <Button onClick={handleDataRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SOLUÇÃO DEFINITIVA: Renderizar versão mobile ultra-simples
  if (isMobile) {
    console.log('🔧 ServiceOrders: Renderizando versão mobile ultra-simples');

    // Dados para mobile - usar dados reais ou fallback
    const mobileOrders = serviceOrders && serviceOrders.length > 0 ? serviceOrders : [
      {
        id: 'mobile-fallback-1',
        clientName: 'Carregando dados...',
        equipmentType: 'Sistema carregando',
        status: 'pending',
        description: 'Aguarde, dados sendo carregados',
        createdAt: new Date().toISOString(),
        clientPhone: null,
        clientEmail: null,
        technicianId: null,
        technicianName: null,
        scheduledDate: null,
        completedDate: null,
        equipmentModel: null,
        equipmentSerial: null,
        needsPickup: false,
        pickupAddress: null,
        currentLocation: 'workshop',
        serviceAttendanceType: 'em_domicilio',
        clientDescription: 'Aguarde, dados sendo carregados'
      }
    ];

    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
        {/* Header ultra-simples */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h1 style={{
            fontSize: '18px',
            margin: '0',
            color: '#2563eb'
          }}>
            📱 Ordens de Serviço Mobile
          </h1>
          <p style={{
            fontSize: '12px',
            margin: '4px 0 0 0',
            color: '#666'
          }}>
            {mobileOrders.length} ordem(ns) encontrada(s)
          </p>
        </div>

        {/* Lista ultra-simples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mobileOrders.slice(0, 10).map((order, index) => (
            <div
              key={order.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                  {order.clientName}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  <DisplayNumber item={order} index={index} variant="inline" size="sm" showIcon={true} />
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
                {order.equipmentType}
              </div>

              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.3'
              }}>
                {order.description || order.clientDescription || 'Sem descrição'}
              </div>

              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#9ca3af'
              }}>
                Status: {order.status === 'pending' ? 'Pendente' :
                        order.status === 'scheduled' ? 'Agendado' :
                        order.status === 'completed' ? 'Concluído' : order.status}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '11px',
          color: '#9ca3af'
        }}>
          Fix Fogões - Versão Mobile Otimizada
        </div>
      </div>
    );
  }

  // CORREÇÃO MOBILE: Ajustar isLoading para mobile e desktop se há dados
  const hasValidData = serviceOrders && serviceOrders.length > 0;
  const adjustedIsLoading = hasValidData ? false : isLoading;

  console.log('🔧 Loading adjustment applied:', { adjustedIsLoading, hasValidData });

  // Se é mobile e tem orderId, mostrar apenas o OrderDetails
  if (isMobileParam && orderId && selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-50" style={{ margin: 0, padding: '16px' }}>
        <style>{`
          body { margin: 0 !important; padding: 0 !important; }
          .container { max-width: none !important; padding: 0 !important; }
          .glass-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        `}</style>
        <ServiceOrderContent
          selectedOrder={selectedOrder}
          isTracking={isTracking}
          handleBackToList={handleBackToList}
          handleTrackingClick={handleTrackingClick}
          isLoading={adjustedIsLoading}
          sortedOrders={finalSortedOrders}
          formatDate={formatDateString}
          handleOrderClick={handleOrderClick}
          sortConfig={sortConfig}
          handleSort={handleSort}
          showAllColumns={showAllColumns}
          toggleColumnVisibility={toggleColumnVisibility}
          refreshKey={refreshKey}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-10 px-2 md:px-4 animate-fade-in">
      <ServiceOrdersHeader refreshServiceOrders={handleDataRefresh} />

      {/* Banner de filtro de badge */}
      {isFilterActive && activeFilter && (
        <BadgeFilterBanner
          isActive={isFilterActive}
          label={activeFilter.label}
          description={activeFilter.description}
          count={activeFilter.count}
          onClear={clearBadgeFilter}
        />
      )}

      <SearchSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        handleStatusFilterChange={handleStatusFilterChange}
        handleSelectAllStatuses={handleSelectAllStatuses}
        handleDeselectAllStatuses={handleDeselectAllStatuses}
      />

      <div className="min-h-[400px] overflow-hidden">
        <ServiceOrderContent
          selectedOrder={selectedOrder}
          isTracking={isTracking}
          handleBackToList={handleBackToList}
          handleTrackingClick={handleTrackingClick}
          isLoading={adjustedIsLoading}
          sortedOrders={finalSortedOrders}
          formatDate={formatDateString}
          handleOrderClick={handleOrderClick}
          sortConfig={sortConfig}
          handleSort={handleSort}
          showAllColumns={showAllColumns}
          toggleColumnVisibility={toggleColumnVisibility}
          refreshKey={refreshKey}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      </div>
    </div>
  );
};

export default ServiceOrdersPage;
