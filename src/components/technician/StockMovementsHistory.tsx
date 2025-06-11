import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Search,
  RefreshCw,
  MapPin,
  User,
  FileText,
  Calendar
} from 'lucide-react';
import technicianStockService, { StockMovement } from '@/services/technicianStockService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockMovementsHistoryProps {
  technicianId: string;
}

const StockMovementsHistory: React.FC<StockMovementsHistoryProps> = ({ technicianId }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Carregar movimentações
  const loadMovements = async () => {
    if (!technicianId) return;
    
    setIsLoading(true);
    try {
      const data = await technicianStockService.getMovements(technicianId, 100);
      setMovements(data);
      setFilteredMovements(data);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
      toast.error('Erro ao carregar histórico de movimentações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [technicianId]);

  // Filtrar movimentações
  useEffect(() => {
    let filtered = movements;

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(movement => 
        movement.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(movement => movement.movement_type === typeFilter);
    }

    // Filtro por data
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(movement => 
            new Date(movement.created_at) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(movement => 
            new Date(movement.created_at) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(movement => 
            new Date(movement.created_at) >= filterDate
          );
          break;
      }
    }

    setFilteredMovements(filtered);
  }, [movements, searchTerm, typeFilter, dateFilter]);

  // Obter cor do tipo de movimento
  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800';
      case 'out':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter label do tipo de movimento
  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Saída';
      default:
        return type;
    }
  };

  // Obter ícone do tipo de movimento
  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4" />;
      case 'out':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando histórico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Movimentações
        </CardTitle>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {filteredMovements.length} movimentações encontradas
          </p>
          <Button 
            onClick={loadMovements}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por item, código ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="in">Entradas</SelectItem>
              <SelectItem value="out">Saídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Movimentações */}
        <div className="space-y-4">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {movements.length === 0 
                  ? 'Nenhuma movimentação encontrada'
                  : 'Nenhuma movimentação corresponde aos filtros aplicados'
                }
              </p>
            </div>
          ) : (
            filteredMovements.map((movement) => (
              <Card key={movement.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getMovementTypeColor(movement.movement_type)}>
                          {getMovementTypeIcon(movement.movement_type)}
                          {getMovementTypeLabel(movement.movement_type)}
                        </Badge>
                        <h4 className="font-semibold">{movement.item.name}</h4>
                        <Badge variant="outline">{movement.item.code}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>
                            <strong>Quantidade:</strong> {movement.quantity} un.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span>
                            <strong>Estoque:</strong> {movement.previous_quantity} → {movement.new_quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-sm">
                            <strong>Motivo:</strong> {movement.reason}
                          </span>
                        </div>
                        
                        {movement.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              <strong>Local:</strong> {movement.location}
                            </span>
                          </div>
                        )}

                        {movement.service_order_id && (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              <strong>OS:</strong> #{movement.service_order_id.slice(-8)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockMovementsHistory;
