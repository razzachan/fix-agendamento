import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  TrendingUp, 
  Filter,
  Download,
  Eye,
  Wrench,
  User,
  MapPin,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/financialCalculations';

interface ConversionDetail {
  id: string;
  conversion_name: string;
  conversion_time: string;
  conversion_value: number;
  equipment_type: string;
  equipment_brand?: string;
  equipment_model?: string;
  problem_description?: string;
  client_name?: string;
  client_phone?: string;
  client_city?: string;
  technician_name?: string;
  service_attendance_type?: string;
  initial_cost?: number;
  final_cost?: number;
  profit_margin?: number;
  completion_days?: number;
  utm_source?: string;
  utm_campaign?: string;
  utm_term?: string;
}

const ConversionDetailsReport: React.FC = () => {
  const [conversions, setConversions] = useState<ConversionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    equipmentType: '',
    conversionType: '',
    utmSource: ''
  });

  const loadConversions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('google_ads_conversions')
        .select('*')
        .gte('conversion_time', filters.startDate + 'T00:00:00Z')
        .lte('conversion_time', filters.endDate + 'T23:59:59Z')
        .order('conversion_time', { ascending: false });

      if (filters.equipmentType) {
        query = query.ilike('equipment_type', `%${filters.equipmentType}%`);
      }
      if (filters.conversionType) {
        query = query.eq('conversion_name', filters.conversionType);
      }
      if (filters.utmSource) {
        query = query.eq('utm_source', filters.utmSource);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar conversões:', error);
        return;
      }

      setConversions(data || []);
    } catch (error) {
      console.error('Erro ao carregar conversões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversions();
  }, []);

  const getStats = () => {
    const totalConversions = conversions.length;
    const totalValue = conversions.reduce((sum, conv) => sum + conv.conversion_value, 0);
    const avgValue = totalConversions > 0 ? totalValue / totalConversions : 0;
    const avgProfitMargin = conversions
      .filter(c => c.profit_margin !== null)
      .reduce((sum, conv, _, arr) => sum + (conv.profit_margin || 0) / arr.length, 0);

    const equipmentStats = conversions.reduce((acc, conv) => {
      const type = conv.equipment_type || 'Não especificado';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceStats = conversions.reduce((acc, conv) => {
      const source = conv.utm_source || 'Direto';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalConversions,
      totalValue,
      avgValue,
      avgProfitMargin,
      equipmentStats,
      sourceStats
    };
  };

  const stats = getStats();

  const exportToCSV = () => {
    const headers = [
      'Data/Hora',
      'Tipo Conversão',
      'Valor',
      'Equipamento',
      'Marca',
      'Modelo',
      'Problema',
      'Cliente',
      'Telefone',
      'Cidade',
      'Técnico',
      'Tipo Atendimento',
      'Custo Inicial',
      'Custo Final',
      'Margem (%)',
      'Fonte',
      'Campanha',
      'Palavra-chave'
    ];

    const rows = conversions.map(conv => [
      new Date(conv.conversion_time).toLocaleString('pt-BR'),
      conv.conversion_name,
      conv.conversion_value.toFixed(2),
      conv.equipment_type || '',
      conv.equipment_brand || '',
      conv.equipment_model || '',
      conv.problem_description || '',
      conv.client_name || '',
      conv.client_phone || '',
      conv.client_city || '',
      conv.technician_name || '',
      conv.service_attendance_type || '',
      conv.initial_cost?.toFixed(2) || '',
      conv.final_cost?.toFixed(2) || '',
      conv.profit_margin?.toFixed(1) || '',
      conv.utm_source || '',
      conv.utm_campaign || '',
      conv.utm_term || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conversoes-detalhadas-${filters.startDate}-${filters.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório Detalhado de Conversões</h2>
          <p className="text-muted-foreground">
            Análise completa dos dados de conversão do Google Ads
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={conversions.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="equipmentType">Equipamento</Label>
              <Input
                id="equipmentType"
                placeholder="Ex: Fogão"
                value={filters.equipmentType}
                onChange={(e) => setFilters(prev => ({ ...prev, equipmentType: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="utmSource">Fonte</Label>
              <Input
                id="utmSource"
                placeholder="Ex: google"
                value={filters.utmSource}
                onChange={(e) => setFilters(prev => ({ ...prev, utmSource: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadConversions} disabled={isLoading} className="w-full">
                {isLoading ? 'Carregando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Análise */}
      {conversions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico por Equipamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Conversões por Equipamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.equipmentStats).map(([equipment, count]) => (
                  <div key={equipment} className="flex items-center justify-between">
                    <span className="text-sm">{equipment}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalConversions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gráfico por Fonte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Conversões por Fonte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.sourceStats).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm">{source}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalConversions) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Conversões</p>
                <p className="text-2xl font-bold">{stats.totalConversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-2xl font-bold">{stats.avgProfitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Conversões */}
      <Card>
        <CardHeader>
          <CardTitle>Conversões Detalhadas ({conversions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversions.slice(0, 20).map((conversion) => (
              <div key={conversion.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{conversion.conversion_name}</Badge>
                    <Badge variant="secondary">{conversion.equipment_type}</Badge>
                    {conversion.utm_source && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {conversion.utm_source}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(conversion.conversion_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conversion.conversion_time).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Wrench className="w-3 h-3" />
                      <span className="font-medium">Equipamento:</span>
                    </div>
                    <p>{conversion.equipment_brand} {conversion.equipment_model}</p>
                    <p className="text-muted-foreground">{conversion.problem_description}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" />
                      <span className="font-medium">Cliente:</span>
                    </div>
                    <p>{conversion.client_name}</p>
                    <p className="text-muted-foreground">{conversion.client_phone}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-medium">Financeiro:</span>
                    </div>
                    <p>Inicial: {formatCurrency(conversion.initial_cost || 0)}</p>
                    <p>Final: {formatCurrency(conversion.final_cost || 0)}</p>
                    {conversion.profit_margin && (
                      <p className="text-green-600">Margem: {conversion.profit_margin.toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {conversions.length > 20 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Mostrando 20 de {conversions.length} conversões. Use os filtros para refinar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversionDetailsReport;
