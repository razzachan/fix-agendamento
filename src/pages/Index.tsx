
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Se ainda estiver carregando, não redirecionar
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar landing page pública
  if (!isAuthenticated) {
    // Redirecionar para a página HTML estática
    window.location.href = '/landing.html';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se estiver autenticado, redirecionar baseado na role
  if (user?.role === 'client') {
    return <Navigate to="/client/portal" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

export default Index;
