import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

/**
 * Hook para verificar permissões baseadas na role do usuário
 * 
 * Fornece funções para verificar se o usuário tem determinadas roles
 * e funções específicas para verificar roles comuns (admin, técnico, etc.)
 */
export function usePermissions() {
  const { user } = useAuth();
  
  /**
   * Verifica se o usuário tem uma ou mais roles específicas
   * @param roles Role única ou array de roles a verificar
   * @returns true se o usuário tiver pelo menos uma das roles especificadas
   */
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    
    const userRole = user.role as UserRole;
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    return roles === userRole;
  };
  
  /**
   * Verifica se o usuário é um administrador
   * @returns true se o usuário for um administrador
   */
  const isAdmin = (): boolean => {
    return hasRole('admin');
  };
  
  /**
   * Verifica se o usuário é um técnico ou administrador
   * @returns true se o usuário for um técnico ou administrador
   */
  const isTechnician = (): boolean => {
    return hasRole(['technician', 'admin']);
  };
  
  /**
   * Verifica se o usuário é uma oficina ou administrador
   * @returns true se o usuário for uma oficina ou administrador
   */
  const isWorkshop = (): boolean => {
    return hasRole(['workshop', 'admin']);
  };
  
  /**
   * Verifica se o usuário é um cliente
   * @returns true se o usuário for um cliente
   */
  const isClient = (): boolean => {
    return hasRole('client');
  };
  
  /**
   * Verifica se o usuário tem permissão para acessar uma ordem de serviço específica
   * @param serviceOrder A ordem de serviço a verificar
   * @returns true se o usuário tiver permissão para acessar a ordem de serviço
   */
  const canAccessServiceOrder = (serviceOrder: any): boolean => {
    if (!user || !serviceOrder) return false;
    
    // Admin tem acesso a tudo
    if (isAdmin()) return true;
    
    // Técnico tem acesso às suas ordens
    if (user.role === 'technician' && serviceOrder.technician_id === user.id) {
      return true;
    }
    
    // Oficina tem acesso às suas ordens
    if (user.role === 'workshop' && serviceOrder.workshop_id === user.id) {
      return true;
    }
    
    // Cliente tem acesso às suas ordens
    if (user.role === 'client' && serviceOrder.client_id === user.id) {
      return true;
    }
    
    return false;
  };
  
  return {
    hasRole,
    isAdmin,
    isTechnician,
    isWorkshop,
    isClient,
    canAccessServiceOrder
  };
}
