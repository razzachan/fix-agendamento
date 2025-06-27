import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { forceLogoutAndClean, isProduction } from '@/utils/productionCleanup';

/**
 * Botão de emergência para limpeza de dados em produção
 */
export function ProductionCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);

  // Só mostrar em produção ou se houver problemas
  if (!isProduction() && !localStorage.getItem('eletrofix_session')) {
    return null;
  }

  const handleCleanup = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso irá limpar todos os dados e fazer logout. Continuar?')) {
      return;
    }

    setIsLoading(true);
    try {
      await forceLogoutAndClean();
    } catch (error) {
      console.error('Erro na limpeza:', error);
      // Forçar redirecionamento mesmo com erro
      window.location.href = '/login';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleCleanup}
        disabled={isLoading}
        variant="destructive"
        size="sm"
        className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Limpando...
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 mr-2" />
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Cache
          </>
        )}
      </Button>
    </div>
  );
}
