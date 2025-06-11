import React, { useEffect, useState } from 'react';
import { serviceOrderService, ServiceOrder } from '../../services/api';

/**
 * Componente de exemplo que demonstra a integração com a API
 * Este componente carrega e exibe uma lista de ordens de serviço
 */
const ApiIntegrationExample: React.FC = () => {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Carregar ordens de serviço ao montar o componente
  useEffect(() => {
    loadServiceOrders();
  }, [page]);

  // Função para carregar ordens de serviço
  const loadServiceOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Chamar o serviço de API para obter ordens de serviço
      const result = await serviceOrderService.getAllServiceOrders({
        page,
        limit: 10
      });

      setServiceOrders(result.data);
      
      // Calcular total de páginas
      if (result.pagination) {
        const totalItems = result.pagination.total;
        const limit = result.pagination.limit;
        setTotalPages(Math.ceil(totalItems / limit));
      }
    } catch (err) {
      console.error('Erro ao carregar ordens de serviço:', err);
      setError('Não foi possível carregar as ordens de serviço. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Função para mudar de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  // Função para formatar data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  // Função para obter classe CSS baseada no status
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para traduzir status
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'scheduled': 'Agendado',
      'in_progress': 'Em andamento',
      'diagnosis': 'Em diagnóstico',
      'awaiting_parts': 'Aguardando peças',
      'awaiting_approval': 'Aguardando aprovação',
      'repair': 'Em reparo',
      'testing': 'Em teste',
      'completed': 'Concluído',
      'delivered': 'Entregue',
      'canceled': 'Cancelado',
      'returned': 'Devolvido'
    };
    
    return statusMap[status] || status;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ordens de Serviço</h1>
      
      {/* Exibir mensagem de erro se houver */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            className="underline ml-2"
            onClick={loadServiceOrders}
          >
            Tentar novamente
          </button>
        </div>
      )}
      
      {/* Exibir indicador de carregamento */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Tabela de ordens de serviço */}
          {serviceOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Cliente</th>
                    <th className="py-2 px-4 border-b text-left">Equipamento</th>
                    <th className="py-2 px-4 border-b text-left">Status</th>
                    <th className="py-2 px-4 border-b text-left">Data de Criação</th>
                    <th className="py-2 px-4 border-b text-left">Data Agendada</th>
                    <th className="py-2 px-4 border-b text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{order.clientName}</td>
                      <td className="py-2 px-4 border-b">{order.equipmentType} {order.equipmentModel}</td>
                      <td className="py-2 px-4 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(order.status)}`}>
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b">{formatDate(order.createdAt)}</td>
                      <td className="py-2 px-4 border-b">
                        {order.scheduledDate ? (
                          <>
                            {formatDate(order.scheduledDate)}
                            {order.scheduledTime && ` ${order.scheduledTime}`}
                          </>
                        ) : (
                          'Não agendado'
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <button className="text-blue-500 hover:text-blue-700 mr-2">
                          Ver
                        </button>
                        <button className="text-green-500 hover:text-green-700">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded">
              <p className="text-gray-500">Nenhuma ordem de serviço encontrada.</p>
            </div>
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-2 border rounded-l-md disabled:opacity-50"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
              >
                Anterior
              </button>
              <div className="px-4 py-2 border-t border-b">
                Página {page + 1} de {totalPages}
              </div>
              <button
                className="px-4 py-2 border rounded-r-md disabled:opacity-50"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages - 1}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApiIntegrationExample;
