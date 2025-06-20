// ===================================================================
// 📊 TIPOS PARA SISTEMA DE RELATÓRIOS AVANÇADOS (MVP 4)
// ===================================================================

import { ReportType, ReportFormat, ReportFilters } from './index';

// Interface principal para relatórios
export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  filters: ReportFilters;
  data: ReportData;
  metadata: ReportMetadata;
  charts?: ReportChart[];
  tables?: ReportTable[];
  summary: ReportSummary;
  generated_at: string;
  generated_by: string;
}

export interface ReportData {
  raw_data: any[];
  processed_data: ProcessedDataSet[];
  aggregations: DataAggregation[];
  comparisons?: DataComparison[];
}

export interface ProcessedDataSet {
  name: string;
  data: any[];
  metadata: {
    total_records: number;
    date_range: {
      start: string;
      end: string;
    };
    filters_applied: string[];
  };
}

export interface DataAggregation {
  field: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';
  value: number;
  formatted_value: string;
  comparison?: {
    previous_period: number;
    change: number;
    change_percentage: number;
  };
}

export interface DataComparison {
  name: string;
  current_period: ComparisonPeriod;
  previous_period: ComparisonPeriod;
  metrics: ComparisonMetric[];
}

export interface ComparisonPeriod {
  start_date: string;
  end_date: string;
  label: string;
}

export interface ComparisonMetric {
  name: string;
  current_value: number;
  previous_value: number;
  change: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

export interface ReportMetadata {
  execution_time: number; // em milissegundos
  data_sources: string[];
  record_count: number;
  filters_applied: ReportFilters;
  export_formats: ReportFormat[];
  file_size?: number;
  cache_key?: string;
  cache_expires?: string;
}

// Tipos para gráficos em relatórios
export interface ReportChart {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: ChartData;
  config: ChartConfig;
  position: ChartPosition;
}

export type ChartType = 
  | 'line'           // Gráfico de linha
  | 'bar'            // Gráfico de barras
  | 'column'         // Gráfico de colunas
  | 'pie'            // Gráfico de pizza
  | 'donut'          // Gráfico de rosca
  | 'area'           // Gráfico de área
  | 'scatter'        // Gráfico de dispersão
  | 'heatmap'        // Mapa de calor
  | 'gauge'          // Medidor
  | 'funnel';        // Funil

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
      format?: string;
    };
  };
  scales?: {
    x?: ChartScale;
    y?: ChartScale;
  };
}

export interface ChartScale {
  display: boolean;
  title?: {
    display: boolean;
    text: string;
  };
  ticks?: {
    format?: string;
    stepSize?: number;
  };
}

export interface ChartPosition {
  row: number;
  column: number;
  width: number; // 1-12 (grid system)
  height: number; // em pixels
}

// Tipos para tabelas em relatórios
export interface ReportTable {
  id: string;
  title: string;
  description?: string;
  columns: TableColumn[];
  rows: TableRow[];
  pagination?: TablePagination;
  sorting?: TableSorting;
  totals?: TableTotals;
  position: ChartPosition;
}

export interface TableColumn {
  key: string;
  title: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'boolean';
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: string;
}

export interface TableRow {
  id: string;
  data: Record<string, any>;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
  };
}

export interface TablePagination {
  page: number;
  per_page: number;
  total_pages: number;
  total_records: number;
}

export interface TableSorting {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableTotals {
  columns: string[]; // colunas que devem ter totais
  values: Record<string, number>;
}

// Tipos para resumo de relatórios
export interface ReportSummary {
  key_metrics: KeyMetric[];
  insights: ReportInsight[];
  recommendations: ReportRecommendation[];
  alerts?: ReportAlert[];
}

export interface KeyMetric {
  name: string;
  value: number;
  formatted_value: string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  target?: {
    value: number;
    achievement_percentage: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ReportInsight {
  type: 'positive' | 'negative' | 'neutral' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  supporting_data: string[];
}

export interface ReportRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimated_impact: string;
  effort_required: 'low' | 'medium' | 'high';
  timeline: string;
  success_metrics: string[];
}

export interface ReportAlert {
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action_required?: string;
}

// Tipos para templates de relatórios
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  default_filters: Partial<ReportFilters>;
  layout: ReportLayout;
  charts: Partial<ReportChart>[];
  tables: Partial<ReportTable>[];
  is_system: boolean; // template do sistema ou customizado
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportLayout {
  page_size: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header: {
    enabled: boolean;
    height: number;
    content: string;
  };
  footer: {
    enabled: boolean;
    height: number;
    content: string;
  };
  grid: {
    columns: number;
    gap: number;
  };
}

// Tipos para exportação de relatórios
export interface ReportExport {
  id: string;
  report_id: string;
  format: ReportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  file_size?: number;
  download_count: number;
  expires_at: string;
  created_at: string;
  error_message?: string;
}

export interface ExportOptions {
  format: ReportFormat;
  include_charts: boolean;
  include_raw_data: boolean;
  compress: boolean;
  password_protect?: boolean;
  password?: string;
  watermark?: string;
}

// Tipos para cache de relatórios
export interface ReportCache {
  key: string;
  report_type: ReportType;
  filters_hash: string;
  data: any;
  created_at: string;
  expires_at: string;
  hit_count: number;
  last_accessed: string;
}
