import React, { createContext, useContext, useCallback } from 'react';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

interface BadgeContextType {
  badges: any;
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate: Date | null;
  refreshBadges: () => void;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const sidebarBadges = useSidebarBadges();
  
  const refreshBadges = useCallback(() => {
    // Força uma atualização dos badges
    window.dispatchEvent(new CustomEvent('refreshBadges'));
  }, []);

  const contextValue: BadgeContextType = {
    ...sidebarBadges,
    refreshBadges
  };

  return (
    <BadgeContext.Provider value={contextValue}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadgeContext() {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadgeContext must be used within a BadgeProvider');
  }
  return context;
}
