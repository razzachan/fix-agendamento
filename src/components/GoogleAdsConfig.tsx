import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  TestTube, 
  ExternalLink,
  RefreshCw,
  Info
} from 'lucide-react';
import { GoogleAdsConfigService } from '@/services/googleAds/googleAdsConfigService';
import { GoogleAdsApiService } from '@/services/googleAds/googleAdsApiService';

interface ConfigStatus {
  isValid: boolean;
  canTestConnection: boolean;
  canUploadConversions: boolean;
  trackingEnabled: boolean;
  config: any;
  urls: any;
  validation: any;
}

export function GoogleAdsConfig() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = () => {
    const currentStatus = GoogleAdsConfigService.getFullStatus();
    setStatus(currentStatus);
  };

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await GoogleAdsConfigService.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Erro ao executar diagnósticos:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await GoogleAdsApiService.testConnection();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: 'Erro ao testar conexão',
        details: { error }
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean, label: string) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className="ml-2">
        {label}
      </Badge>
    );
  };

  if (!status) {
    return <div>Carregando configuração...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração Google Ads API
          </CardTitle>
          <CardDescription>
            Status e configuração da integração com Google Ads API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="test">Testes</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span>Configuração Válida</span>
                      {getStatusIcon(status.isValid)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span>Pode Testar Conexão</span>
                      {getStatusIcon(status.canTestConnection)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span>Pode Enviar Conversões</span>
                      {getStatusIcon(status.canUploadConversions)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span>Tracking Habilitado</span>
                      {getStatusIcon(status.trackingEnabled)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {status.validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Avisos:</strong>
                    <ul className="mt-2 list-disc list-inside">
                      {status.validation.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Customer ID</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {status.config.customerId}
                  </code>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Client ID</span>
                  {getStatusBadge(status.config.hasClientId, status.config.hasClientId ? 'Configurado' : 'Não configurado')}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Client Secret</span>
                  {getStatusBadge(status.config.hasClientSecret, status.config.hasClientSecret ? 'Configurado' : 'Não configurado')}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Refresh Token</span>
                  {getStatusBadge(status.config.hasRefreshToken, status.config.hasRefreshToken ? 'Configurado' : 'Não configurado')}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Developer Token</span>
                  <Badge variant={
                    status.config.developerTokenStatus === 'configured' ? 'default' :
                    status.config.developerTokenStatus === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {status.config.developerTokenStatus === 'configured' ? 'Configurado' :
                     status.config.developerTokenStatus === 'pending' ? 'Pendente' : 'Não configurado'}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={runDiagnostics} 
                  disabled={isRunningDiagnostics}
                  variant="outline"
                >
                  {isRunningDiagnostics ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Executar Diagnósticos
                </Button>
                
                <Button 
                  onClick={testConnection} 
                  disabled={!status.canTestConnection || isTestingConnection}
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
              </div>

              {connectionResult && (
                <Alert>
                  {connectionResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>{connectionResult.success ? 'Sucesso' : 'Erro'}:</strong> {connectionResult.message}
                    {connectionResult.details && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(connectionResult.details, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {diagnostics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Resultados dos Diagnósticos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Configuração:</span>
                        {getStatusIcon(diagnostics.tests.configuration.success)}
                        <span>{diagnostics.tests.configuration.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>OAuth:</span>
                        {diagnostics.tests.oauth.skipped ? (
                          <Info className="h-4 w-4 text-gray-400" />
                        ) : (
                          getStatusIcon(diagnostics.tests.oauth.success)
                        )}
                        <span>{diagnostics.tests.oauth.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Conexão:</span>
                        {diagnostics.tests.connection.skipped ? (
                          <Info className="h-4 w-4 text-gray-400" />
                        ) : (
                          getStatusIcon(diagnostics.tests.connection.success)
                        )}
                        <span>{diagnostics.tests.connection.message}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="setup" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Links úteis para configuração do Google Ads API
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-3">
                  <Button variant="outline" asChild>
                    <a href={status.urls.googleCloudConsole} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Google Cloud Console
                    </a>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <a href={status.urls.oauthPlayground} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      OAuth Playground
                    </a>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <a href={status.urls.googleAdsApiCenter} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Central de API Google Ads
                    </a>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <a href={status.urls.documentation} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentação
                    </a>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
