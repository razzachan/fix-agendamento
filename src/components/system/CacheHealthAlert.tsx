import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  X, 
  Settings,
  Loader2,
  Zap
} from 'lucide-react';
import { useCacheManager } from '@/hooks/useCacheManager';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CacheHealthAlertProps {
  className?: string;
  showWhenHealthy?: boolean;
}

export const CacheHealthAlert: React.FC<CacheHealthAlertProps> = ({ 
  className = '',
  showWhenHealthy = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();
  
  const {
    hasIssues,
    issues,
    isChecking,
    isFixing,
    lastCheck,
    autoFixAvailable,
    isHealthy,
    needsAttention,
    canAutoFix,
    checkCacheIssues,
    autoFix,
    clearCache,
    runDiagnostic,
    getAlerts
  } = useCacheManager();

  // Não mostrar se foi dispensado ou se está saudável e não deve mostrar
  if (isDismissed || (isHealthy && !showWhenHealthy)) {
    return null;
  }

  const handleAutoFix = async () => {
    try {
      toast({
        title: "Correção Automática",
        description: "Iniciando correção automática de problemas...",
      });

      const result = await autoFix();
      
      if (result.fixed) {
        toast({
          title: "Problemas Corrigidos",
          description: `${result.actions.length} problema(s) corrigido(s) automaticamente.`,
        });
      } else {
        toast({
          title: "Correção Parcial",
          description: "Alguns problemas foram corrigidos. Pode ser necessário limpar o cache completamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro na Correção",
        description: "Erro ao corrigir problemas automaticamente.",
        variant: "destructive"
      });
    }
  };

  const handleClearCache = async () => {
    try {
      toast({
        title: "Limpeza de Cache",
        description: "Iniciando limpeza completa do cache...",
      });

      const success = await clearCache();
      
      if (success) {
        toast({
          title: "Cache Limpo",
          description: "Cache limpo com sucesso! A página será recarregada.",
        });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Erro na Limpeza",
          description: "Erro ao limpar cache. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao limpar cache.",
        variant: "destructive"
      });
    }
  };

  const handleDiagnostic = () => {
    runDiagnostic();
    toast({
      title: "Diagnóstico Executado",
      description: "Verifique o console do navegador para detalhes completos.",
    });
  };

  const getAlertVariant = () => {
    if (isHealthy) return 'default';
    if (needsAttention) return 'destructive';
    return 'default';
  };

  const getAlertIcon = () => {
    if (isHealthy) return <CheckCircle className="h-4 w-4" />;
    if (needsAttention) return <AlertTriangle className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  const getAlertTitle = () => {
    if (isHealthy) return 'Sistema Saudável';
    if (needsAttention) return 'Problemas Críticos de Cache';
    return 'Problemas de Cache Detectados';
  };

  return (
    <Alert variant={getAlertVariant()} className={`${className} relative`}>
      {getAlertIcon()}
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <AlertTitle className="flex items-center gap-2">
            {getAlertTitle()}
            {hasIssues && (
              <Badge variant={needsAttention ? 'destructive' : 'secondary'}>
                {issues.length} problema{issues.length > 1 ? 's' : ''}
              </Badge>
            )}
          </AlertTitle>
          
          <div className="flex items-center gap-2">
            {!isHealthy && (
              <>
                {canAutoFix && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoFix}
                    disabled={isFixing}
                    className="h-7"
                  >
                    {isFixing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    Corrigir
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCache}
                  className="h-7 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar Cache
                </Button>
              </>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <AlertDescription className="mt-2">
          {isHealthy ? (
            <div className="text-green-700">
              Cache do sistema está funcionando corretamente.
              {lastCheck && (
                <span className="text-xs text-gray-500 ml-2">
                  Última verificação: {lastCheck.toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2">
                {needsAttention 
                  ? 'Problemas críticos foram detectados no cache do sistema que podem afetar o funcionamento.'
                  : 'Alguns problemas foram detectados no cache que podem afetar a performance.'
                }
              </p>
              
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-xs">
                    {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-gray-50 rounded p-3 text-xs">
                    <p className="font-medium mb-2">Problemas encontrados:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {issues.map((issue, index) => (
                        <li key={index} className="text-gray-700">{issue}</li>
                      ))}
                    </ul>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={checkCacheIssues}
                        disabled={isChecking}
                        className="h-6 text-xs"
                      >
                        {isChecking ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Verificar Novamente
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDiagnostic}
                        className="h-6 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Diagnóstico Completo
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};
