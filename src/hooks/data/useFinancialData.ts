
import { useState } from 'react';

export function useFinancialData() {
  // This is a placeholder for future financial data management
  // Currently in useAppData.ts, it was just an empty array
  const [financialTransactions] = useState([]);
  
  return {
    financialTransactions
  };
}
