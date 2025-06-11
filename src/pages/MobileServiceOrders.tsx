import React, { useState, useEffect } from 'react';
import { hasOrderValue } from '@/utils/orderValue';
import OrderValue from '@/components/ServiceOrders/OrderValue';

// Componente ultra-simples para mobile
const MobileServiceOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simular carregamento de dados
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Dados mock para teste
        const mockOrders = [
          {
            id: '1',
            clientName: 'José Pereira',
            equipmentType: 'Micro-ondas',
            status: 'Em Aberto',
            createdAt: '2023-06-02',
            description: 'Micro-ondas não esquenta'
          },
          {
            id: '2',
            clientName: 'Maria Costa',
            equipmentType: 'Refrigerador',
            status: 'Agendado',
            createdAt: '2025-05-20',
            description: 'Geladeira não está gelando'
          },
          {
            id: '3',
            clientName: 'João Santos',
            equipmentType: 'Fogão',
            status: 'Concluído',
            createdAt: '2025-05-23',
            description: 'Não acende as bocas'
          }
        ];

        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setOrders(mockOrders);
        setError('');
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar ordens de serviço');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Aberto': return 'bg-gray-100 text-gray-800';
      case 'Agendado': return 'bg-blue-100 text-blue-800';
      case 'Concluído': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Erro</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">📱 Ordens de Serviço</h1>
        <p className="text-sm text-gray-600">Versão Mobile</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Orders List */}
      {!isLoading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order, index) => (
            <div 
              key={order.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-sm text-gray-900">
                    {order.clientName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {order.equipmentType}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  #{index + 1}
                </span>
              </div>

              {/* Status */}
              <div className="mb-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              {/* Valor da Ordem */}
              {hasOrderValue(order) && (
                <div className="mb-2">
                  <OrderValue order={order} size="sm" showTooltip={false} />
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-gray-600 mb-2">
                {order.description}
              </p>

              {/* Date */}
              <div className="text-xs text-gray-400">
                📅 {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma ordem encontrada
          </h3>
          <p className="text-gray-600 text-sm">
            Não há ordens de serviço para exibir no momento.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          EletroFix Hub Pro - Mobile
        </p>
      </div>
    </div>
  );
};

export default MobileServiceOrders;
