import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Search,
  Plus,
  Minus,
  RefreshCw,
  Truck,
  BarChart3,
  Clock,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import technicianStockService, { TechnicianStock, StockAlert } from '@/services/technicianStockService';
import { StockConsumptionDialog } from './StockConsumptionDialog';
import { StockReplenishmentDialog } from './StockReplenishmentDialog';
import { StockRequestDialog } from './StockRequestDialog';
import StockMovementsHistory from './StockMovementsHistory';
import { useStockAutoUpdate } from '@/hooks/useStockUpdateEvents';
import { toast } from 'sonner';

interface TechnicianStockDashboardProps {
  className?: string;
}

const TechnicianStockDashboard: React.FC<TechnicianStockDashboardProps> = ({ 
  className = "" 
}) => {
  const { user } = useAuth();
  const [stock, setStock] = useState<TechnicianStock[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedItem, setSelectedItem] = useState<TechnicianStock | null>(null);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [showReplenishmentDialog, setShowReplenishmentDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Carregar dados do estoque
  const loadStockData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [stockData, alertsData] = await Promise.all([
        technicianStockService.getTechnicianStock(user.id),
        technicianStockService.getStockAlerts(user.id)
      ]);
      
      setStock(stockData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
      toast.error('Erro ao carregar dados do estoque.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sistema de atualização automática
  const { notifyStockUpdate } = useStockAutoUpdate(
    user?.id || '',
    () => {
      console.log('🔄 [TechnicianStockDashboard] Forçando recarregamento dos dados');
      loadStockData();
    },
    'TechnicianStockDashboard'
  );

  useEffect(() => {
    loadStockData();
  }, [user?.id]);

  // Listener adicional para eventos de estoque
  useEffect(() => {
    const handleStockUpdate = (event: any) => {
      console.log('🔄 [TechnicianStockDashboard] Evento de estoque recebido:', event.detail);

      // Forçar recarregamento múltiplo para garantir atualização
      setTimeout(() => {
        console.log('🔄 [TechnicianStockDashboard] Primeira tentativa de recarregamento');
        loadStockData();
      }, 200);

      setTimeout(() => {
        console.log('🔄 [TechnicianStockDashboard] Segunda tentativa de recarregamento');
        loadStockData();
      }, 1000);

      setTimeout(() => {
        console.log('🔄 [TechnicianStockDashboard] Terceira tentativa de recarregamento');
        loadStockData();
      }, 2000);
    };

    // Escutar eventos customizados
    window.addEventListener('stockUpdated', handleStockUpdate);

    return () => {
      window.removeEventListener('stockUpdated', handleStockUpdate);
    };
  }, []);

  // Filtrar itens
  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const matchesSearch = !searchTerm || 
        item.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.item.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stock, searchTerm, categoryFilter, statusFilter]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalItems = stock.length;
    const lowStockItems = stock.filter(item => item.stock_status === 'low_stock').length;
    const outOfStockItems = stock.filter(item => item.stock_status === 'out_of_stock').length;
    const totalValue = stock.reduce((sum, item) => sum + item.total_value, 0);
    const categories = [...new Set(stock.map(item => item.item.category))];

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      categoriesCount: categories.length
    };
  }, [stock]);

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'full_stock':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'low_stock':
        return 'Estoque Baixo';
      case 'out_of_stock':
        return 'Sem Estoque';
      case 'full_stock':
        return 'Estoque Cheio';
      default:
        return status;
    }
  };

  // Handlers para ações
  const handleConsume = (item: TechnicianStock) => {
    setSelectedItem(item);
    setShowConsumptionDialog(true);
  };

  const handleReplenish = (item: TechnicianStock) => {
    setSelectedItem(item);
    setShowReplenishmentDialog(true);
  };

  const handleRequest = (item: TechnicianStock) => {
    setSelectedItem(item);
    setShowRequestDialog(true);
  };

  const handleDialogSuccess = () => {
    setShowConsumptionDialog(false);
    setShowReplenishmentDialog(false);
    setShowRequestDialog(false);
    setSelectedItem(null);

    // Forçar recarregamento imediato
    console.log('🔄 [TechnicianStockDashboard] Forçando recarregamento após sucesso do dialog');
    setTimeout(() => {
      loadStockData();
    }, 500);

    // Emitir evento customizado adicional
    window.dispatchEvent(new CustomEvent('stockUpdated', {
      detail: { source: 'TechnicianStockDashboard', action: 'dialog_success' }
    }));
  };

  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600" />
            Estoque Móvel
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie o estoque da sua van em tempo real
          </p>
        </div>
        <Button 
          onClick={loadStockData}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.categoriesCount} categorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Precisam reposição
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Itens zerados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Investimento na van
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Estoque */}
      {alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-yellow-700">
                    <strong>{alert.name}</strong> - {alert.current_quantity} un. 
                    (mín: {alert.min_quantity})
                  </span>
                  <Badge variant="outline" className="text-yellow-700">
                    Faltam {alert.quantity_needed}
                  </Badge>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-xs text-yellow-600">
                  +{alerts.length - 3} outros alertas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Estoque Atual
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Aba Estoque Atual */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="fusivel">Fusíveis</SelectItem>
                <SelectItem value="resistencia">Resistências</SelectItem>
                <SelectItem value="termostato">Termostatos</SelectItem>
                <SelectItem value="cabo">Cabos</SelectItem>
                <SelectItem value="ferramenta">Ferramentas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low_stock">Estoque Baixo</SelectItem>
                <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Itens */}
          <div className="grid gap-4">
            {filteredStock.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{item.item.name}</h3>
                        <Badge className={getStatusColor(item.stock_status)}>
                          {getStatusLabel(item.stock_status)}
                        </Badge>
                        <Badge variant="outline">{item.item.category}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Código:</span>
                          <span>{item.item.code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Estoque:</span>
                          <span className="font-bold">{item.current_quantity} un.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Valor:</span>
                          <span>R$ {item.total_value.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Local:</span>
                          <span>{item.location_in_vehicle || 'Não definido'}</span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Limites:</span> 
                        Mín: {item.min_quantity} | Máx: {item.max_quantity}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConsume(item)}
                        disabled={item.current_quantity === 0}
                        className="flex items-center gap-2"
                      >
                        <Minus className="h-4 w-4" />
                        Usar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReplenish(item)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Repor
                      </Button>
                      {item.stock_status === 'low_stock' || item.stock_status === 'out_of_stock' ? (
                        <Button
                          size="sm"
                          onClick={() => handleRequest(item)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Package className="h-4 w-4" />
                          Solicitar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="movements">
          <StockMovementsHistory technicianId={user?.id || ''} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedItem && (
        <>
          <StockConsumptionDialog
            open={showConsumptionDialog}
            onOpenChange={setShowConsumptionDialog}
            item={selectedItem}
            onSuccess={handleDialogSuccess}
          />

          <StockReplenishmentDialog
            open={showReplenishmentDialog}
            onOpenChange={setShowReplenishmentDialog}
            item={selectedItem}
            onSuccess={handleDialogSuccess}
          />

          <StockRequestDialog
            open={showRequestDialog}
            onOpenChange={setShowRequestDialog}
            item={selectedItem}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
    </div>
  );
};

export default TechnicianStockDashboard;
