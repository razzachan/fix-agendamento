import React from 'react';
import { motion } from 'framer-motion';
import MainCalendarView from '@/components/calendar/MainCalendarView';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const MainCalendarPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você precisa estar logado para acessar o calendário.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <MainCalendarView />
    </motion.div>
  );
};

export default MainCalendarPage;
