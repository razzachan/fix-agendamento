
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/hooks/useAppData';
import { useDashboardUtils } from '@/hooks/useDashboardUtils';
import { useTechnicianOrders } from '@/hooks/useTechnicianOrders';
import { useTechnicianOrdersTest } from '@/hooks/useTechnicianOrdersTest';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingState from '@/components/dashboard/LoadingState';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import UserDashboard from '@/components/dashboard/UserDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import WorkshopDashboard from '@/components/dashboard/WorkshopDashboard';
import WorkshopAdvancedDashboard from '@/components/workshop/WorkshopAdvancedDashboard';


const Dashboard: React.FC = () => {
  // 🚨 FORÇAR ATUALIZAÇÃO - TIMESTAMP: ${Date.now()}
  console.log('🚀🚀🚀 [Dashboard] NOVA VERSÃO CARREGADA! v4.0 🚀🚀🚀');
  console.log('🔥🔥🔥 [Dashboard] CACHE QUEBRADO! TIMESTAMP:', Date.now());

  // 🚨 ALERT PARA GARANTIR QUE ESTÁ FUNCIONANDO
  alert('🎯 DASHBOARD v4.0 CARREGADO! Cache quebrado!');

  // 🚨 TESTE SUPER SIMPLES SEM HOOKS
  const [testValue, setTestValue] = React.useState('Teste inicial');

  console.log('🔥 [Dashboard] TESTE 2 - useState funcionando!', testValue);

  React.useEffect(() => {
    console.log('🔥 [Dashboard] TESTE 3 - useEffect funcionando!');
    setTestValue('Teste atualizado');
  }, []);

  console.log('🔥 [Dashboard] TESTE 4 - Antes do return!');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1 style={{ color: 'green' }}>✅ Dashboard v3.0 - Cache Limpo!</h1>
      <p>Se você vê isso, o Dashboard está funcionando!</p>
      <p><strong>Test Value:</strong> {testValue}</p>
      <button
        onClick={() => {
          console.log('🔥 [Dashboard] BOTÃO CLICADO!');
          setTestValue('Clicado em ' + new Date().toLocaleTimeString());
        }}
        style={{ padding: '10px', backgroundColor: 'blue', color: 'white' }}
      >
        Testar Clique
      </button>
    </div>
  );
};

export default Dashboard;
