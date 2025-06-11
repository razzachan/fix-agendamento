
import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import AgendamentoItem from './AgendamentoItem';
import { AgendamentoAI } from '@/services/agendamentos';

interface AgendamentosTableProps {
  filteredAgendamentos: AgendamentoAI[];
  getStatusButtonClass: (status: string) => string;
  getUrgencyClass: (agendamento: AgendamentoAI) => string;
  isToday: (dateString: string) => boolean;
  openConfirmDialog: (agendamento: AgendamentoAI) => void;
  openRescheduleDialog: (agendamento: AgendamentoAI) => void;
  openCancelDialog: (agendamento: AgendamentoAI) => void;
  openRoutingDialog: (agendamento: AgendamentoAI) => void;
  openCreateOrderDialog: (agendamento: AgendamentoAI) => void;
}

const AgendamentosTable: React.FC<AgendamentosTableProps> = ({
  filteredAgendamentos,
  getStatusButtonClass,
  getUrgencyClass,
  isToday,
  openConfirmDialog,
  openRescheduleDialog,
  openCancelDialog,
  openRoutingDialog,
  openCreateOrderDialog,
}) => {
  if (filteredAgendamentos.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
      </div>
    );
  }

  // Check if any agendamento has data_agendada
  const showScheduledDateColumn = filteredAgendamentos.some(ag => ag.data_agendada !== null);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-medium">Cliente</TableHead>
            <TableHead className="font-medium">Endereço</TableHead>
            <TableHead className="font-medium">Equipamento</TableHead>
            <TableHead className="font-medium">Problema</TableHead>
            {showScheduledDateColumn && (
              <TableHead className="font-medium">Data definida</TableHead>
            )}
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgendamentos.map((agendamento) => (
            <AgendamentoItem
              key={agendamento.id}
              agendamento={agendamento}
              getStatusButtonClass={getStatusButtonClass}
              getUrgencyClass={getUrgencyClass}
              isToday={isToday}
              openConfirmDialog={openConfirmDialog}
              openRescheduleDialog={openRescheduleDialog}
              openCancelDialog={openCancelDialog}
              openRoutingDialog={openRoutingDialog}
              openCreateOrderDialog={openCreateOrderDialog}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AgendamentosTable;
