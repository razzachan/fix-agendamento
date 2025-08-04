
import React from 'react';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  // Redirecionar para dashboard para usuários autenticados
  // ou login para usuários não autenticados
  // O AppLayout já cuida da lógica de redirecionamento baseada em role
  return <Navigate to="/dashboard" replace />;
};

export default Index;
