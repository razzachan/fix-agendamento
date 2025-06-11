
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarView } from '@/hooks/calendar';
import TechnicianSelect from '@/components/calendar/TechnicianSelect';
import CalendarCard from '@/components/calendar/CalendarCard';
import EventsCard from '@/components/calendar/EventsCard';
import { Loader2, RefreshCcw, Calendar as CalendarIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const {
    date,
    setDate,
    isLoading,
    technicians,
    selectedTechnicianId,
    setSelectedTechnicianId,
    hasScheduledServices,
    filteredServices,
    formatTime,
    getStatusColor,
    getStatusBadge,
    refreshServices
  } = useCalendarView(user);
  
  useEffect(() => {
    // Log details for debugging
    console.log('CalendarView renderizado', {
      isLoading,
      servicesCount: filteredServices.length,
      technicianId: selectedTechnicianId
    });
  }, [isLoading, filteredServices, selectedTechnicianId]);
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleRefresh = () => {
    toast.info('Sincronizando dados do calendário...');
    refreshServices();
  };
  
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-lg shadow-md">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-700">
            {user?.role === 'technician' ? 'Meu Calendário de Serviços' : 'Calendário de Serviços'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Sincronizar Serviços
              </>
            )}
          </Button>
          
          {user?.role === 'admin' && (
            <div className="flex items-center gap-1 bg-white p-1 pr-2 rounded-lg border shadow-sm">
              <div className="bg-indigo-100 p-1 rounded-md mr-1">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <TechnicianSelect 
                technicians={technicians}
                selectedTechnicianId={selectedTechnicianId}
                onSelect={setSelectedTechnicianId}
              />
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CalendarCard
            date={date}
            setDate={setDate}
            hasScheduledServices={hasScheduledServices}
            selectedTechnicianName={technicians.find(t => t.id === selectedTechnicianId)?.name}
            isAdminView={user?.role === 'admin'}
          />
        </motion.div>
        
        <motion.div 
          className="md:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <EventsCard
            date={date}
            isLoading={isLoading}
            filteredServices={filteredServices}
            getStatusBadge={getStatusBadge}
            formatTime={formatTime}
            getStatusColor={getStatusColor}
            selectedTechnicianId={selectedTechnicianId}
            technicians={technicians}
            user={user}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CalendarView;
