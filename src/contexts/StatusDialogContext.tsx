import React, { createContext, useContext, useState } from 'react';

interface StatusDialogContextType {
  showStatusAdvanceDialog: boolean;
  setShowStatusAdvanceDialog: (show: boolean) => void;
  serviceOrderId: string | null;
  setServiceOrderId: (id: string | null) => void;
}

const StatusDialogContext = createContext<StatusDialogContextType | undefined>(undefined);

export const StatusDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showStatusAdvanceDialog, setShowStatusAdvanceDialog] = useState(false);
  const [serviceOrderId, setServiceOrderId] = useState<string | null>(null);

  console.log('🎯 [StatusDialogContext] Estado global:', { showStatusAdvanceDialog, serviceOrderId });

  return (
    <StatusDialogContext.Provider value={{
      showStatusAdvanceDialog,
      setShowStatusAdvanceDialog,
      serviceOrderId,
      setServiceOrderId
    }}>
      {children}
    </StatusDialogContext.Provider>
  );
};

export const useStatusDialog = () => {
  const context = useContext(StatusDialogContext);
  if (context === undefined) {
    throw new Error('useStatusDialog must be used within a StatusDialogProvider');
  }
  return context;
};
