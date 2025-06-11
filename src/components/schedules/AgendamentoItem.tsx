
import React from 'react';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Check, AlertTriangle, Calendar, Map, X, Route, FileText } from 'lucide-react';
import { AgendamentoAI } from '@/services/agendamentos';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMap } from '@/contexts/MapContext';

interface AgendamentoItemProps {
  agendamento: AgendamentoAI;
  getStatusButtonClass: (status: string) => string;
  getUrgencyClass: (agendamento: AgendamentoAI) => string;
  isToday: (dateString: string) => boolean;
  openConfirmDialog: (agendamento: AgendamentoAI) => void;
  openRescheduleDialog: (agendamento: AgendamentoAI) => void;
  openCancelDialog: (agendamento: AgendamentoAI) => void;
  openRoutingDialog: (agendamento: AgendamentoAI) => void;
  openCreateOrderDialog: (agendamento: AgendamentoAI) => void;
}

const AgendamentoItem: React.FC<AgendamentoItemProps> = ({
  agendamento,
  getStatusButtonClass,
  getUrgencyClass,
  isToday,
  openConfirmDialog,
  openRescheduleDialog,
  openCancelDialog,
  openRoutingDialog,
  openCreateOrderDialog,
}) => {
  // Usar o contexto do mapa
  const { openAddressMap } = useMap();

  // Formatar a data de criação para exibição
  const formattedCreationDate = agendamento.created_at
    ? format(new Date(agendamento.created_at), 'dd/MM/yyyy HH:mm')
    : 'Sem data';

  // Formatar a data agendada (se existir)
  const formattedScheduledDate = agendamento.data_agendada
    ? format(new Date(agendamento.data_agendada), 'dd/MM/yyyy HH:mm')
    : null;

  // Função para abrir o modal do mapa
  const handleMapView = () => {
    openAddressMap(agendamento.endereco, agendamento.nome);
  };

  // Log para debug - verificar se os dados estão presentes
  console.log('Dados do agendamento:', {
    id: agendamento.id,
    nome: agendamento.nome,
    telefone: agendamento.telefone,
    endereco: agendamento.endereco,
    cpf: agendamento.cpf,
    email: agendamento.email
  });

  return (
    <TableRow
      key={agendamento.id}
      className={getUrgencyClass(agendamento)}
    >
      <TableCell className="font-medium">
        <div>
          {agendamento.nome}
          <div className="text-xs text-muted-foreground flex items-center mt-1">
            <Calendar size={12} className="mr-1" />
            Pedido: {formattedCreationDate}
          </div>
          <div className="text-xs text-muted-foreground flex flex-col mt-1">
            {agendamento.telefone && (
              <>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <a
                    href={`tel:${agendamento.telefone.replace(/\D/g, '')}`}
                    className="hover:text-primary hover:underline flex items-center"
                    title="Ligar para este número"
                  >
                    {agendamento.telefone}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14L21 3"></path>
                    </svg>
                  </a>
                </div>
                <div className="flex items-center mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#25D366" className="mr-1">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <a
                    href={`https://wa.me/55${agendamento.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-green-600 hover:underline flex items-center"
                    title="Enviar mensagem no WhatsApp"
                  >
                    WhatsApp
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14L21 3"></path>
                    </svg>
                  </a>
                </div>
              </>
            )}

            {agendamento.email && (
              <div className="flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <a
                  href={`mailto:${agendamento.email}`}
                  className="hover:text-primary hover:underline flex items-center"
                  title="Enviar e-mail"
                >
                  {agendamento.email}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14L21 3"></path>
                  </svg>
                </a>
              </div>
            )}

            {agendamento.cpf && (
              <div className="flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="text-gray-600">CPF: {agendamento.cpf}</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="flex items-center">
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`mr-2 w-2 h-2 rounded-full ${agendamento.status === 'confirmado' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            {agendamento.endereco}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-1"
                    onClick={handleMapView}
                  >
                    <Map size={16} className="text-gray-500 hover:text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver no mapa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {agendamento.tecnico && (
            <div className="text-xs text-muted-foreground ml-4 mt-1">
              Técnico: <span className="font-medium">{agendamento.tecnico}</span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>{agendamento.equipamento}</TableCell>
      <TableCell>{agendamento.problema}</TableCell>
      {formattedScheduledDate && (
        <TableCell>
          <div className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            <Calendar size={12} className="mr-1" />
            {formattedScheduledDate}
          </div>
        </TableCell>
      )}
      <TableCell>
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusButtonClass(agendamento.status)}`}>
          {agendamento.status === 'pendente' && 'Pendente'}
          {agendamento.status === 'confirmado' && (
            <>
              <Check size={14} className="mr-1" />
              Confirmado
            </>
          )}
          {agendamento.status === 'reagendado' && 'Reagendado'}
          {agendamento.status === 'cancelado' && 'Cancelado'}
          {agendamento.status === 'roteirizado' && 'Roteirizado'}
          {agendamento.status === 'os_criada' && (
            <>
              <FileText size={14} className="mr-1" />
              OS Criada
            </>
          )}
        </div>

        {agendamento.urgente && (
          <div className="flex items-center text-red-600 mt-1">
            <AlertTriangle size={14} className="mr-1" />
            <span className="text-xs">Urgente</span>
          </div>
        )}

        {/* Indicador de origem */}
        {agendamento.origem === 'clientechat' && (
          <div className="flex items-center text-blue-600 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span className="text-xs">ClienteChat</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2 flex-wrap">
          {/* Botões para agendamentos pendentes que NÃO são do Clientechat */}
          {agendamento.status === 'pendente' && agendamento.origem !== 'clientechat' && (
            <>
              <Button
                onClick={() => openConfirmDialog(agendamento)}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8"
              >
                <Check className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
              <Button
                onClick={() => openRescheduleDialog(agendamento)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Reagendar
              </Button>
            </>
          )}

          {/* Botões para agendamentos pendentes do Clientechat - ir direto para roteirização */}
          {agendamento.status === 'pendente' && agendamento.origem === 'clientechat' && (
            <Button
              onClick={() => openRoutingDialog(agendamento)}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xs h-8"
            >
              <Route className="h-4 w-4 mr-1" />
              Roteirizar
            </Button>
          )}

          {/* Botões para agendamentos confirmados */}
          {agendamento.status === 'confirmado' && (
            <Button
              onClick={() => openRoutingDialog(agendamento)}
              className="bg-purple-500 hover:bg-purple-600 text-white text-xs h-8"
            >
              <Route className="h-4 w-4 mr-1" />
              Roteirizar
            </Button>
          )}

          {/* Botões para agendamentos roteirizados */}
          {agendamento.status === 'roteirizado' && (
            <Button
              onClick={() => openCreateOrderDialog(agendamento)}
              className="bg-green-500 hover:bg-green-600 text-white text-xs h-8"
            >
              <FileText className="h-4 w-4 mr-1" />
              Criar OS
            </Button>
          )}

          {/* Botão para visualizar a ordem de serviço criada */}
          {agendamento.status === 'os_criada' && (
            <Button
              onClick={() => window.location.href = '/orders'}
              className="bg-teal-500 hover:bg-teal-600 text-white text-xs h-8"
            >
              <FileText className="h-4 w-4 mr-1" />
              Ver OS
            </Button>
          )}

          {/* Botão de reagendamento para status roteirizado e confirmado */}
          {(agendamento.status === 'roteirizado' || agendamento.status === 'confirmado') && agendamento.status !== 'os_criada' && (
            <Button
              onClick={() => openRescheduleDialog(agendamento)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Reagendar
            </Button>
          )}

          {/* Botão de cancelamento para todos os status exceto cancelados e os_criada */}
          {agendamento.status !== 'cancelado' && agendamento.status !== 'os_criada' && (
            <Button
              onClick={() => openCancelDialog(agendamento)}
              className="bg-red-500 hover:bg-red-600 text-white text-xs h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default AgendamentoItem;
