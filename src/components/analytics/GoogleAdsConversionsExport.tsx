import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  RefreshCw,
  Zap,
  Settings,
  CheckCircle2,
  X
} from 'lucide-react';
import { useGoogleAdsTracking } from '@/hooks/useGoogleAdsTracking';
import { formatCurrency } from '@/utils/financialCalculations';
import { GoogleAdsConfigValidator } from '@/utils/googleAdsConfigValidator';

const GoogleAdsConversionsExport: React.FC = () => {
  const {
    isLoading,
    conversions,
    trackingParams,
    loadConversions,
    exportConversions,
    hasActiveTracking,
    getConversionStats,
    uploadToGoogleAdsApi,
    testGoogleAdsConnection
  } = useGoogleAdsTracking();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const stats = getConversionStats();

  const handleLoadConversions = () => {
    loadConversions(startDate + 'T00:00:00Z', endDate + 'T23:59:59Z');
  };

  const handleExportConversions = () => {
    exportConversions(startDate + 'T00:00:00Z', endDate + 'T23:59:59Z');
  };

  const handleAutoUpload = () => {
    uploadToGoogleAdsApi(startDate + 'T00:00:00Z', endDate + 'T23:59:59Z');
  };

  const handleTestConnection = () => {
    testGoogleAdsConnection();
  };

  // Validar configuração (browser-safe)
  const configValidation = GoogleAdsConfigValidator.validateConfig();
  const hasMinimalConfig = GoogleAdsConfigValidator.hasMinimalConfig();

  // Status de demonstração para o browser
  const isDemoMode = typeof window !== 'undefined';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conversões Google Ads</h2>
          <p className="text-muted-foreground">
            Exporte conversões offline para otimizar suas campanhas
          </p>
        </div>
        
        {hasActiveTracking() && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Target className="w-3 h-3 mr-1" />
            Tracking Ativo
          </Badge>
        )}
      </div>

      {/* Tracking Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Status do Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">GCLID</Label>
              <p className="font-mono text-sm">
                {trackingParams.gclid ? 
                  `${trackingParams.gclid.substring(0, 20)}...` : 
                  'Não detectado'
                }
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fonte</Label>
              <p className="text-sm">{trackingParams.utmSource || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Campanha</Label>
              <p className="text-sm">{trackingParams.utmCampaign || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período para Exportação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleLoadConversions}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Carregar
              </Button>
              <Button
                onClick={handleExportConversions}
                disabled={isLoading || conversions.length === 0}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                onClick={handleAutoUpload}
                disabled={isLoading || conversions.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Envio Automático
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {conversions.length > 0 && (
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
                  <p className="text-sm text-muted-foreground">Tipos</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.conversionsByType).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Conversões */}
      {conversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversões Encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversions.slice(0, 10).map((conversion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{conversion.conversionName}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {conversion.orderId}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      GCLID: {conversion.googleClickId.substring(0, 30)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(conversion.conversionValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conversion.conversionTime).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
              
              {conversions.length > 10 && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    E mais {conversions.length - 10} conversões...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuração da API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração da API
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status da Configuração */}
          <div className={`p-4 border rounded-lg mb-4 ${
            isDemoMode
              ? 'border-blue-200 bg-blue-50'
              : configValidation.isValid
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {isDemoMode ? (
                    <Settings className="w-4 h-4 text-blue-600" />
                  ) : configValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  Google Ads API {isDemoMode && '(Modo Demonstração)'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isDemoMode
                    ? 'Configuração deve ser feita no servidor por segurança'
                    : configValidation.isValid
                      ? 'Configuração válida - Pronto para envio automático'
                      : `${configValidation.errors.length} erro(s) de configuração`
                  }
                </p>
              </div>
              <Button
                onClick={handleTestConnection}
                disabled={isLoading}
                variant={isDemoMode ? "default" : configValidation.isValid ? "default" : "outline"}
                size="sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isDemoMode ? 'Testar (Demo)' : 'Testar Conexão'}
              </Button>
            </div>

            {/* Erros de Configuração */}
            {configValidation.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                <h5 className="font-medium text-red-800 mb-2">Erros de Configuração:</h5>
                <ul className="text-sm text-red-700 space-y-1">
                  {configValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avisos */}
            {configValidation.warnings.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-200">
                <h5 className="font-medium text-yellow-800 mb-2">Avisos:</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {configValidation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Vantagens do Envio Automático:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ⚡ Conversões enviadas automaticamente em tempo real</li>
              <li>• 🎯 Otimização mais rápida das campanhas</li>
              <li>• 📊 Dados sempre atualizados no Google Ads</li>
              <li>• 🔄 Sem necessidade de upload manual</li>
            </ul>

            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                📋 <strong>Como configurar o Google Ads API:</strong>
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>1. Configure as variáveis de ambiente no servidor</p>
                <p>2. Consulte: <code>docs/GOOGLE_ADS_SETUP.md</code></p>
                <p>3. Reinicie o servidor após configurar</p>
                <p className="text-blue-600 font-medium mt-2">
                  ⚠️ Por segurança, credenciais não são expostas no browser
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div>
              <p className="font-medium">Configure o período</p>
              <p className="text-sm text-muted-foreground">
                Selecione as datas inicial e final para buscar conversões
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div>
              <p className="font-medium">Carregue as conversões</p>
              <p className="text-sm text-muted-foreground">
                Clique em "Carregar" para buscar conversões não exportadas
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <p className="font-medium">Exporte para o Google Ads</p>
              <p className="text-sm text-muted-foreground">
                Baixe o arquivo CSV e faça upload na seção "Conversões" do Google Ads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAdsConversionsExport;
