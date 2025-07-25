import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAgendamentosData } from '@/hooks/data/useAgendamentosData';
import RoutingManager from '@/components/schedules/RoutingManager';
import PageHeader from '@/components/layout/PageHeader';
import { Route, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/auth/useUser';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const RoutingPage: React.FC = () => {
  const { agendamentos, isLoading, fetchAgendamentos } = useAgendamentosData();
  const { user } = useUser();
  const navigate = useNavigate();

  // Verificar permissões do usuário
  useEffect(() => {
    // Apenas administradores e técnicos podem acessar esta página
    if (user && user.role !== 'admin' && user.role !== 'technician') {
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/');
    }
  }, [user, navigate]);

  // Função para lidar com a criação de uma rota
  const handleRouteCreated = (routeId: string) => {
    console.log('Rota criada com ID:', routeId);
    // Aqui você pode implementar ações adicionais após a criação da rota
  };

  // Função para atualizar os agendamentos após alterações
  const handleAgendamentosUpdated = () => {
    fetchAgendamentos();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full py-6 px-0 sm:container sm:mx-auto sm:px-6 lg:px-8"
      >
        <PageHeader
          title="Roteirização Inteligente"
          description="Crie e gerencie rotas otimizadas para os técnicos com base nos pré-agendamentos."
          icon={<Route className="h-8 w-8 text-blue-600" />}
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <span className="ml-3 text-lg text-gray-700">Carregando agendamentos...</span>
          </div>
        ) : (
          <RoutingManager
            agendamentos={agendamentos}
            onRouteCreated={handleRouteCreated}
            onAgendamentosUpdated={handleAgendamentosUpdated}
          />
        )}
      </motion.div>
    </>
  );
};

export default RoutingPage;
