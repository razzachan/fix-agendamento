import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  DollarSign,
  MapPin,
  Calendar,
  Users,
  Zap,
  PieChart,
  Activity,
  Filter,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/financialCalculations';

interface BIMetrics {
  totalRevenue: number;
  totalConversions: number;
  avgTicket: number;
  conversionRate: number;
  roiBySource: Record<string, { revenue: number; cost: number; roi: number }>;
  equipmentPerformance: Record<string, { count: number; revenue: number; avgTicket: number }>;
  geographicData: Record<string, { count: number; revenue: number }>;
  conversionFunnel: {
    leads: number;
    scheduled: number;
    completed: number;
    paid: number;
  };
  timeSeriesData: Array<{
    date: string;
    conversions: number;
    revenue: number;
  }>;
}

const AdvancedBIDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<BIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const loadBIMetrics = async () => {
    setIsLoading(true);
    try {
      // Buscar dados de conversões
      const { data: conversions, error } = await supabase
        .from('google_ads_conversions')
        .select('*')
        .gte('conversion_time', dateRange.startDate + 'T00:00:00Z')
        .lte('conversion_time', dateRange.endDate + 'T23:59:59Z');

      if (error) {
        console.error('Erro ao carregar métricas BI:', error);
        return;
      }

      // Processar dados
      const processedMetrics = processConversionsData(conversions || []);
      setMetrics(processedMetrics);

    } catch (error) {
      console.error('Erro ao processar métricas BI:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processConversionsData = (conversions: any[]): BIMetrics => {
    const totalRevenue = conversions.reduce((sum, conv) => sum + (conv.conversion_value || 0), 0);
    const totalConversions = conversions.length;
    const avgTicket = totalConversions > 0 ? totalRevenue / totalConversions : 0;

    // ROI por fonte (simulado - precisaria de dados de custo)
    const roiBySource = conversions.reduce((acc, conv) => {
      const source = conv.utm_source || 'Direto';
      if (!acc[source]) {
        acc[source] = { revenue: 0, cost: 0, roi: 0 };
      }
      acc[source].revenue += conv.conversion_value || 0;
      acc[source].cost += 100; // Custo simulado
      acc[source].roi = ((acc[source].revenue - acc[source].cost) / acc[source].cost) * 100;
      return acc;
    }, {} as Record<string, { revenue: number; cost: number; roi: number }>);

    // Performance por equipamento
    const equipmentPerformance = conversions.reduce((acc, conv) => {
      const equipment = conv.equipment_type || 'Não especificado';
      if (!acc[equipment]) {
        acc[equipment] = { count: 0, revenue: 0, avgTicket: 0 };
      }
      acc[equipment].count += 1;
      acc[equipment].revenue += conv.conversion_value || 0;
      acc[equipment].avgTicket = acc[equipment].revenue / acc[equipment].count;
      return acc;
    }, {} as Record<string, { count: number; revenue: number; avgTicket: number }>);

    // Dados geográficos
    const geographicData = conversions.reduce((acc, conv) => {
      const city = conv.client_city || 'Não informado';
      if (!acc[city]) {
        acc[city] = { count: 0, revenue: 0 };
      }
      acc[city].count += 1;
      acc[city].revenue += conv.conversion_value || 0;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    // Funil de conversão (simulado)
    const leads = conversions.filter(c => c.conversion_name === 'Lead_Gerado').length;
    const scheduled = conversions.filter(c => c.conversion_name === 'Agendamento').length;
    const completed = conversions.filter(c => c.conversion_name.includes('Concluido')).length;
    const paid = conversions.filter(c => c.conversion_name === 'Pagamento_Recebido').length;

    // Série temporal (últimos 7 dias)
    const timeSeriesData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayConversions = conversions.filter(c => 
        c.conversion_time.startsWith(dateStr)
      );
      
      return {
        date: dateStr,
        conversions: dayConversions.length,
        revenue: dayConversions.reduce((sum, c) => sum + (c.conversion_value || 0), 0)
      };
    }).reverse();

    return {
      totalRevenue,
      totalConversions,
      avgTicket,
      conversionRate: 0.15, // Simulado
      roiBySource,
      equipmentPerformance,
      geographicData,
      conversionFunnel: { leads, scheduled, completed, paid },
      timeSeriesData
    };
  };

  useEffect(() => {
    loadBIMetrics();
  }, [dateRange]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p>Carregando métricas avançadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard BI Avançado</h2>
          <p className="text-muted-foreground">
            Análise completa de performance e ROI
          </p>
        </div>
        <Button onClick={() => loadBIMetrics()} disabled={isLoading}>
          <Activity className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold">{metrics.totalConversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.avgTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                <p className="text-2xl font-bold">{(metrics.conversionRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análises */}
      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="equipment">Por Equipamento</TabsTrigger>
          <TabsTrigger value="roi">ROI por Fonte</TabsTrigger>
          <TabsTrigger value="funnel">Funil Conversão</TabsTrigger>
          <TabsTrigger value="geographic">Geográfico</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Equipamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.equipmentPerformance).map(([equipment, data]) => (
                  <div key={equipment} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">{equipment}</h4>
                      <p className="text-sm text-muted-foreground">{data.count} conversões</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(data.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        Média: {formatCurrency(data.avgTicket)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ROI por Fonte de Tráfego</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.roiBySource).map(([source, data]) => (
                  <div key={source} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <h4 className="font-medium">{source}</h4>
                      <p className="text-sm text-muted-foreground">
                        Receita: {formatCurrency(data.revenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={data.roi > 200 ? "default" : data.roi > 100 ? "secondary" : "destructive"}>
                        ROI: {data.roi.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <span>Leads Gerados</span>
                  <span className="font-bold">{metrics.conversionFunnel.leads}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span>Agendamentos</span>
                  <span className="font-bold">{metrics.conversionFunnel.scheduled}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
                  <span>Serviços Concluídos</span>
                  <span className="font-bold">{metrics.conversionFunnel.completed}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <span>Pagamentos Recebidos</span>
                  <span className="font-bold">{metrics.conversionFunnel.paid}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição Geográfica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.geographicData)
                  .sort(([,a], [,b]) => b.revenue - a.revenue)
                  .slice(0, 10)
                  .map(([city, data]) => (
                  <div key={city} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{city}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(data.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{data.count} conversões</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedBIDashboard;
