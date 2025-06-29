import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * Componente para proteger rotas baseado nas roles do usuário
 * 
 * Verifica se o usuário está autenticado e tem uma das roles permitidas.
 * Caso contrário, redireciona para a página especificada.
 * 
 * @param children Conteúdo a ser renderizado se o usuário tiver permissão
 * @param allowedRoles Array de roles que têm permissão para acessar a rota
 * @param redirectTo Página para redirecionar se o usuário não tiver permissão (padrão: /dashboard)
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/dashboard'
}) => {
  console.log('🔐 [ProtectedRoute] Executando ProtectedRoute');
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  console.log('🔐 [ProtectedRoute] Auth state:', { user, isAuthenticated, isLoading, location: location.pathname });

  // Se ainda estiver carregando, mostra um indicador de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não estiver autenticado, redireciona para o login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário não tiver a role necessária, redireciona para a página apropriada
  if (user && !allowedRoles.includes(user.role as UserRole)) {
    // Redirecionar clientes para o portal do cliente
    if (user.role === 'client') {
      return <Navigate to="/client/portal" state={{ from: location }} replace />;
    }
    // Outros usuários para o dashboard padrão
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Se tudo estiver ok, renderiza o conteúdo
  return <>{children}</>;
};

export default ProtectedRoute;
