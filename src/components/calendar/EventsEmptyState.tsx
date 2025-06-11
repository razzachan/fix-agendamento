
import React from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useServicesVerification } from '@/hooks/calendar/useServicesVerification';
import VerificationSection from './VerificationSection';
import FoundServicesList from './FoundServicesList';
import FoundOrdersList from './FoundOrdersList';
import { User } from '@/types';

interface EventsEmptyStateProps {
  user: User | null;
  selectedTechnicianId: string;
  date?: Date;
}

const EventsEmptyState: React.FC<EventsEmptyStateProps> = ({
  user,
  selectedTechnicianId,
  date
}) => {
  const {
    isCheckingData,
    hasAnyServices,
    foundServices,
    foundOrders,
    checkForAnyServices,
    syncServiceOrders
  } = useServicesVerification(selectedTechnicianId);

  // Verificamos automaticamente ao montar o componente ou quando a data ou técnico mudar
  React.useEffect(() => {
    if (selectedTechnicianId && selectedTechnicianId !== 'all') {
      console.log('EventsEmptyState: Verificando serviços automaticamente para', selectedTechnicianId);
      checkForAnyServices();
    }
  }, [selectedTechnicianId, date, checkForAnyServices]);

  // Formatar a mensagem de data ou usar um texto genérico
  const dateMessage = date 
    ? `${format(date, 'dd/MM/yyyy')}` 
    : 'Nenhuma data selecionada';

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-8">
      <AlertCircle className="h-12 w-12 text-purple-400 mb-4" />
      <p className="text-gray-700 text-lg font-medium">Nenhum serviço agendado para esta data.</p>
      <p className="text-sm text-gray-500 mt-2 max-w-md">
        {dateMessage} - 
        {user?.role === 'admin' && selectedTechnicianId !== 'all' 
          ? ' Tente selecionar outro técnico ou outra data no calendário.' 
          : ' Selecione outra data para verificar agendamentos disponíveis.'}
      </p>
      
      {selectedTechnicianId !== 'all' && (
        <>
          <VerificationSection
            isCheckingData={isCheckingData}
            hasAnyServices={hasAnyServices}
            foundOrders={foundOrders}
            onVerifyClick={checkForAnyServices}
            onSyncClick={syncServiceOrders}
          />
          <FoundServicesList services={foundServices} />
          <FoundOrdersList orders={foundOrders} />
        </>
      )}
    </div>
  );
};

export default EventsEmptyState;
