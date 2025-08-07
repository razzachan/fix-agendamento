import React, { useEffect } from 'react';

const PublicLanding: React.FC = () => {
  useEffect(() => {
    // Redirecionar para a página HTML estática
    window.location.href = '/landing.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  );
};

export default PublicLanding;
