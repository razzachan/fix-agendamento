import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { FinancialAnalytics } from '@/services/financialAnalyticsService';

interface FinancialChartsProps {
  analytics: FinancialAnalytics;
}

export function FinancialCharts({ analytics }: FinancialChartsProps) {
  // Cores para os gráficos
  const colors = {
    revenue: '#10B981', // Verde
    expenses: '#EF4444', // Vermelho
    profit: '#3B82F6',   // Azul
    primary: '#6366F1',  // Índigo
    secondary: '#8B5CF6', // Roxo
    accent: '#F59E0B'    // Âmbar
  };

  // Cores para gráfico de pizza
  const pieColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  /**
   * Formatar moeda para tooltips
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formatar data para gráficos
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  /**
   * Preparar dados para gráfico de linha temporal
   */
  const timelineData = analytics.revenueByPeriod.map(item => ({
    ...item,
    dateFormatted: formatDate(item.date)
  }));

  /**
   * Preparar dados para gráfico de pizza (receita por tipo de serviço)
   */
  const serviceTypeData = analytics.revenueByServiceType.map((item, index) => ({
    name: item.serviceType,
    value: item.revenue,
    count: item.count,
    color: pieColors[index % pieColors.length]
  }));

  /**
   * Preparar dados para gráfico de barras (técnicos)
   */
  const technicianData = analytics.revenueByTechnician
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10) // Top 10 técnicos
    .map(item => ({
      name: item.technicianName.split(' ')[0], // Apenas primeiro nome
      revenue: item.revenue,
      orders: item.ordersCount,
      average: item.averageOrderValue
    }));

  /**
   * Tooltip customizado para gráficos
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  /**
   * Tooltip para gráfico de pizza
   */
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-green-600">
            Receita: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Ordens: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Linha - Evolução Temporal */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Evolução Financeira ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={colors.revenue} 
                strokeWidth={2}
                name="Receita"
                dot={{ fill: colors.revenue, strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke={colors.expenses} 
                strokeWidth={2}
                name="Despesas"
                dot={{ fill: colors.expenses, strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke={colors.profit} 
                strokeWidth={2}
                name="Lucro"
                dot={{ fill: colors.profit, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Pizza - Receita por Tipo de Serviço */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Tipo de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Top Técnicos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Técnicos por Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={technicianData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Receita']}
                labelStyle={{ color: '#374151' }}
              />
              <Bar 
                dataKey="revenue" 
                fill={colors.primary}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Área - Receita vs Despesas */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Comparativo Receita vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke={colors.revenue}
                fill={colors.revenue}
                fillOpacity={0.6}
                name="Receita"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke={colors.expenses}
                fill={colors.expenses}
                fillOpacity={0.6}
                name="Despesas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumo em Cards */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumo por Tipo de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.revenueByServiceType.map((item, index) => (
              <div 
                key={index}
                className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <h4 className="font-medium text-gray-900">{item.serviceType}</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(item.revenue)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.count} ordens
                  </p>
                  <p className="text-sm text-gray-600">
                    Ticket médio: {formatCurrency(item.averageValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
