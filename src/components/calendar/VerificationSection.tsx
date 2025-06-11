
import React from 'react';
import { Search, RefreshCcw, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types';

interface VerificationSectionProps {
  isCheckingData: boolean;
  hasAnyServices: boolean | null;
  foundOrders: ServiceOrder[];
  onVerifyClick: () => void;
  onSyncClick: () => void;
}

const VerificationSection: React.FC<VerificationSectionProps> = ({
  isCheckingData,
  hasAnyServices,
  foundOrders,
  onVerifyClick,
  onSyncClick
}) => {
  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onVerifyClick}
        disabled={isCheckingData}
        className="flex items-center gap-2 bg-white hover:bg-gray-100"
      >
        {isCheckingData ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando no banco de dados...
          </>
        ) : (
          <>
            <Database className="h-4 w-4" />
            Verificar disponibilidade de serviços
          </>
        )}
      </Button>
      
      {foundOrders.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSyncClick}
          disabled={isCheckingData}
          className="flex items-center gap-2 mt-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200"
        >
          {isCheckingData ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" />
              Sincronizar {foundOrders.length} Ordens com Calendário
            </>
          )}
        </Button>
      )}
      
      {hasAnyServices === true && (
        <p className="text-sm text-green-600 mt-4 bg-green-50 p-3 rounded-md border border-green-200">
          Existem serviços agendados para este técnico em outras datas.
          Por favor, tente navegar pelo calendário para encontrá-los.
        </p>
      )}
      
      {hasAnyServices === false && (
        <div className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-md max-w-md">
          <p className="text-sm text-amber-700 font-medium">
            Não foram encontrados serviços agendados para este técnico.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <p className="text-sm text-amber-700">Para que serviços apareçam no calendário:</p>
            <ol className="text-sm text-amber-700 list-decimal list-inside">
              <li>Crie ordens de serviço para o técnico</li>
              <li>Defina uma data de agendamento na ordem</li>
              <li>Clique em "Sincronizar Ordens com Calendário"</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationSection;
