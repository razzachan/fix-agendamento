
import { useState } from 'react';

export function useTechnicianData() {
  // This is a placeholder for future technician data management
  // Currently in useAppData.ts, it was just an empty array
  const [technicians] = useState([]);
  
  return {
    technicians
  };
}
