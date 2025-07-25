import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ForceLogout: React.FC = () => {
  useEffect(() => {
    const forceLogout = async () => {
      console.log('🚨 [ForceLogout] Iniciando logout forçado...');
      
      try {
        // 1. Logout do Supabase
        await supabase.auth.signOut();
        console.log('✅ [ForceLogout] Logout do Supabase realizado');
        
        // 2. Limpar localStorage
        localStorage.clear();
        console.log('✅ [ForceLogout] localStorage limpo');
        
        // 3. Limpar sessionStorage
        sessionStorage.clear();
        console.log('✅ [ForceLogout] sessionStorage limpo');
        
        // 4. Redirecionar para login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        
      } catch (error) {
        console.error('❌ [ForceLogout] Erro:', error);
        // Mesmo com erro, limpar e redirecionar
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    };
    
    forceLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Fazendo logout...</h2>
        <p className="text-gray-600">Limpando dados e redirecionando...</p>
      </div>
    </div>
  );
};

export default ForceLogout;
