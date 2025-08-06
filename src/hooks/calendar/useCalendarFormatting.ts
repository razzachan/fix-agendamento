
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useCalendarFormatting = () => {
  // Format time from ISO string to readable format
  // 🔧 CORREÇÃO UTC: Converter UTC para horário local (Brasil)
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  // Get event status color
  const getStatusColor = (status: string) => {
    switch (status) {
      // 🔵 AZUL - Agendado/Confirmado
      case 'confirmed':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';

      // 🟣 ROXO - Em trânsito/coleta
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop':
        return 'bg-orange-100 text-orange-800 border-orange-200';

      // 🔵 CIANO - Em diagnóstico
      case 'diagnosis':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'awaiting_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'in_repair':
        return 'bg-green-100 text-green-800 border-green-200';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_delivery':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';

      // ✅ VERDE ESCURO - Concluído
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';

      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Return badge data instead of JSX
  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      // Status básicos
      'scheduled': 'Agendado',
      'confirmed': 'Confirmado',
      'pending': 'Em aberto',
      'cancelled': 'Cancelado',
      'suggested': 'Sugerido',

      // Processo de coleta diagnóstico
      'in_progress': 'Em Trânsito',
      'on_the_way': 'À Caminho',
      'collected': 'Coletado',
      'at_workshop': 'Na Oficina',
      'diagnosis': 'Em Diagnóstico',
      'awaiting_approval': 'Aguardando Aprovação',
      'in_repair': 'Em Reparo',
      'ready_delivery': 'Pronto p/ Entrega',
      'completed': 'Concluído',
      'payment_pending': 'Pagamento'
    };

    const colors: Record<string, string> = {
      // 🔵 AZUL - Agendado/Confirmado
      'scheduled': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'confirmed': 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'pending': 'bg-slate-100 text-slate-800 hover:bg-slate-200',

      // 🟣 ROXO - Em trânsito/coleta
      'in_progress': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'on_the_way': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'collected': 'bg-purple-100 text-purple-800 hover:bg-purple-200',

      // 🟠 LARANJA - Na oficina (recebido)
      'at_workshop': 'bg-orange-100 text-orange-800 hover:bg-orange-200',

      // 🔵 CIANO - Em diagnóstico
      'diagnosis': 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',

      // 🟡 AMARELO - Aguardando aprovação do cliente
      'awaiting_approval': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      'in_repair': 'bg-green-100 text-green-800 hover:bg-green-200',

      // 🔷 AZUL ESCURO - Pronto para entrega
      'ready_delivery': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
      'payment_pending': 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',

      // ✅ VERDE ESCURO - Concluído
      'completed': 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',

      // 🔴 VERMELHO - Cancelado
      'cancelled': 'bg-red-100 text-red-800 hover:bg-red-200',

      // 🟡 AMARELO CLARO - Sugerido
      'suggested': 'bg-amber-100 text-amber-800 hover:bg-amber-200'
    };

    return {
      label: statusLabels[status] || status,
      className: `${colors[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'} border-none`
    };
  };

  return {
    formatTime,
    getStatusColor,
    getStatusBadge
  };
};
