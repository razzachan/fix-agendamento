import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AgendamentoAI } from '@/services/agendamentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Wrench,
  AlertTriangle,
  Clock,
  Package,
  MessageSquare,
  Plus,
  FileText
} from 'lucide-react';
import CreateOrderModal from './CreateOrderModal';

interface PreAgendamentosViewProps {
  agendamentos: AgendamentoAI[];
}

const PreAgendamentosView: React.FC<PreAgendamentosViewProps> = ({ agendamentos }) => {
  // Estado para controlar o modal de criação de OS
  const [createOrderModal, setCreateOrderModal] = useState<{
    isOpen: boolean;
    agendamento: AgendamentoAI | null;
  }>({
    isOpen: false,
    agendamento: null
  });

  // Função para abrir modal de criação de OS
  const handleCreateOrder = (agendamento: AgendamentoAI) => {
    setCreateOrderModal({
      isOpen: true,
      agendamento
    });
  };

  // Função para fechar modal
  const closeCreateOrderModal = () => {
    setCreateOrderModal({
      isOpen: false,
      agendamento: null
    });
  };



  if (agendamentos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Nenhum pré-agendamento encontrado
        </h3>
        <p className="text-sm text-muted-foreground">
          Os pré-agendamentos aparecerão aqui quando forem recebidos
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'confirmado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'roteirizado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'convertido':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Em Aberto';
      case 'confirmado':
        return 'Confirmado';
      case 'roteirizado':
        return 'Roteirizado';
      case 'cancelado':
        return 'Cancelado';
      case 'convertido':
        return 'OS Criada';
      default:
        return status;
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const parseEquipamentos = (equipamentos: any): string[] => {
    if (Array.isArray(equipamentos)) return equipamentos;
    if (typeof equipamentos === 'string') {
      try {
        const parsed = JSON.parse(equipamentos);
        return Array.isArray(parsed) ? parsed : [equipamentos];
      } catch {
        return [equipamentos];
      }
    }
    return [];
  };

  const parseProblemas = (problemas: any): string[] => {
    if (Array.isArray(problemas)) return problemas;
    if (typeof problemas === 'string') {
      try {
        const parsed = JSON.parse(problemas);
        return Array.isArray(parsed) ? parsed : [problemas];
      } catch {
        return [problemas];
      }
    }
    return [];
  };

  return (
    <div className="space-y-4">
      {agendamentos.map((agendamento) => {
        const equipamentos = parseEquipamentos(agendamento.equipamentos || agendamento.equipamento);
        const problemas = parseProblemas(agendamento.problemas || agendamento.problema);
        const hasMultipleEquipments = equipamentos.length > 1;

        return (
          <Card 
            key={agendamento.id} 
            className={`transition-all duration-200 hover:shadow-md border-l-4 ${
              agendamento.urgente 
                ? 'border-l-red-500 bg-red-50/30' 
                : 'border-l-[#e5b034] bg-white'
            }`}
          >
            <CardContent className="p-6">
              {/* Header com Status e Urgência */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[#e5b034]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {agendamento.nome}
                    </h3>
                  </div>
                  {agendamento.urgente && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Urgente
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(agendamento.status)}
                  >
                    {getStatusLabel(agendamento.status)}
                  </Badge>
                  {agendamento.created_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(agendamento.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  {agendamento.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${agendamento.telefone.replace(/\D/g, '')}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {formatPhone(agendamento.telefone)}
                      </a>
                      <a 
                        href={`https://wa.me/55${agendamento.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                        title="WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {agendamento.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${agendamento.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {agendamento.email}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-gray-700">{agendamento.endereco}</span>
                  </div>
                  
                  {agendamento.data_agendada && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-gray-700">
                        Agendado para: {format(new Date(agendamento.data_agendada), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Equipamentos e Problemas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-[#e5b034]" />
                  <h4 className="font-medium text-gray-900">
                    {hasMultipleEquipments ? 'Equipamentos' : 'Equipamento'}
                  </h4>
                  {hasMultipleEquipments && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {equipamentos.length} itens
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {equipamentos.map((equipamento, index) => (
                    <div 
                      key={index}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-1">
                          {equipamento}
                        </div>
                        {problemas[index] && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Problema:</span> {problemas[index]}
                          </div>
                        )}
                      </div>
                      
                      {hasMultipleEquipments && (
                        <Badge variant="outline" className="ml-2">
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações Adicionais */}
              {(agendamento.tipo_servico || agendamento.logistica || agendamento.tecnico) && (
                <>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    {agendamento.tipo_servico && (
                      <Badge variant="outline">
                        {agendamento.tipo_servico === 'in-home' ? 'Em Domicílio' : 'Coleta'}
                      </Badge>
                    )}
                    {agendamento.logistica && (
                      <Badge variant="outline">
                        Grupo {agendamento.logistica}
                      </Badge>
                    )}
                    {agendamento.tecnico && (
                      <Badge variant="outline">
                        Técnico: {agendamento.tecnico}
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {/* Botão Criar OS */}
              {agendamento.status !== 'convertido' && (
                <>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleCreateOrder(agendamento)}
                      className="bg-[#e5b034] hover:bg-[#d4a02a] text-white flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Criar OS
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Modal de Criação de OS */}
      <CreateOrderModal
        isOpen={createOrderModal.isOpen}
        onClose={closeCreateOrderModal}
        agendamento={createOrderModal.agendamento}
        onOrderCreated={() => {
          closeCreateOrderModal();
          // Recarregar a página para atualizar a lista
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />
    </div>
  );
};

export default PreAgendamentosView;
