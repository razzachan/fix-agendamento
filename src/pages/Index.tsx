
import React from 'react';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  // Usar Navigate como componente declarativo
  // em vez de useNavigate com useEffect para evitar loops
  return <Navigate to="/login" replace />;
};

export default Index;
