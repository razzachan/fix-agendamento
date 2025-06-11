import React from 'react';
import WorkshopDashboard from '@/components/dashboard/WorkshopDashboard';

/**
 * Página de demonstração do WorkshopDashboard
 * Para testar o painel de oficina sem problemas de autenticação
 */
const WorkshopDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏭 Demonstração - Painel de Oficina
          </h1>
          <p className="text-gray-600">
            Visualização completa do WorkshopDashboard implementado
          </p>
        </div>
        
        {/* WorkshopDashboard */}
        <WorkshopDashboard />
      </div>
    </div>
  );
};

export default WorkshopDemo;
