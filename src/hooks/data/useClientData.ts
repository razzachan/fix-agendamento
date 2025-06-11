
import { useState } from 'react';

export function useClientData() {
  // This is a placeholder for future client data management
  // Currently in useAppData.ts, it was just an empty array
  const [clients] = useState([]);
  
  return {
    clients
  };
}
