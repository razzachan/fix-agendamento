import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendamentoAI, agendamentosService } from '@/services/agendamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Check, X, Phone, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RoutedAppointmentsManagerProps {
  selectedDate: Date;
  onAgendamentosUpdated: () => void;
}

const RoutedAppointmentsManager: React.FC<RoutedAppointmentsManagerProps> = ({
  selectedDate,
  onAgendamentosUpdated
}) => {
  const [routedAgendamentos, setRoutedAgendamentos] = useState<AgendamentoAI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoAI | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [confirmationDate, setConfirmationDate] = useState('');
  const [confirmationTime, setConfirmationTime] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Carregar agendamentos roteirizados quando a data mudar
  useEffect(() => {
    loadRoutedAgendamentos();
  }, [selectedDate]);

  const loadRoutedAgendamentos = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      const allAgendamentos = await agendamentosService.getAll();

      // Filtrar agendamentos roteirizados para a data selecionada
      const filtered = allAgendamentos.filter(agendamento => {
        // Verificar se o agendamento está roteirizado
        if (agendamento.status !== 'roteirizado') return false;

        // Se não houver data selecionada, mostrar todos
        if (!selectedDate) return true;

        // Verificar se o agendamento tem data_agendada
        if (agendamento.data_agendada) {
          const agendamentoDate = new Date(agendamento.data_agendada);
          return (
            agendamentoDate.getFullYear() === selectedDate.getFullYear() &&
            agendamentoDate.getMonth() === selectedDate.getMonth() &&
            agendamentoDate.getDate() === selectedDate.getDate()
          );
        }

        // Se não tiver data_agendada, incluir com base na data de criação
        const createdDate = new Date(agendamento.created_at);
        return (
          createdDate.getFullYear() === selectedDate.getFullYear() &&
          createdDate.getMonth() === selectedDate.getMonth() &&
          createdDate.getDate() === selectedDate.getDate()
        );
      });

      setRoutedAgendamentos(filtered);
    } catch (error) {
      console.error('Erro ao carregar agendamentos roteirizados:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirmDialog = (agendamento: AgendamentoAI) => {
    setSelectedAgendamento(agendamento);

    // Definir data e hora atuais como valores padrão
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm');

    setConfirmationDate(today);
    setConfirmationTime(now);
    setIsConfirmDialogOpen(true);
  };

  const openRejectDialog = (agendamento: AgendamentoAI) => {
    setSelectedAgendamento(agendamento);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleConfirmAgendamento = async () => {
    if (!selectedAgendamento) return;

    try {
      setIsLoading(true);

      // Formatar a data e hora para o formato esperado pelo backend
      const fullDateTime = `${confirmationDate}T${confirmationTime}:00`;

      // Atualizar o agendamento para confirmado
      await agendamentosService.update(selectedAgendamento.id, {
        status: 'confirmado',
        data_agendada: fullDateTime
      });

      toast.success('Agendamento confirmado com sucesso!');
      setIsConfirmDialogOpen(false);

      // Recarregar a lista de agendamentos
      loadRoutedAgendamentos();

      // Notificar o componente pai
      if (onAgendamentosUpdated) {
        onAgendamentosUpdated();
      }
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast.error('Erro ao confirmar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAgendamento = async () => {
    if (!selectedAgendamento) return;

    try {
      setIsLoading(true);

      // Atualizar o agendamento para rejeitado
      await agendamentosService.update(selectedAgendamento.id, {
        status: 'pendente',
        tecnico: null
      });

      toast.success('Agendamento retornado para pendente');
      setIsRejectDialogOpen(false);

      // Recarregar a lista de agendamentos
      loadRoutedAgendamentos();

      // Notificar o componente pai
      if (onAgendamentosUpdated) {
        onAgendamentosUpdated();
      }
    } catch (error) {
      console.error('Erro ao rejeitar agendamento:', error);
      toast.error('Erro ao processar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar agendamentos com base na aba ativa
  const filteredAgendamentos = routedAgendamentos.filter(agendamento => {
    if (activeTab === 'pending') {
      return agendamento.status === 'roteirizado';
    } else if (activeTab === 'confirmed') {
      return agendamento.status === 'confirmado';
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Confirmação de Agendamentos</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRoutedAgendamentos}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Aguardando Confirmação
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Confirmados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {filteredAgendamentos.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="p-6 text-center text-gray-500">
                Nenhum agendamento roteirizado aguardando confirmação.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableCaption>Lista de agendamentos roteirizados aguardando confirmação</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Urgente</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgendamentos.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell className="font-medium">{agendamento.nome}</TableCell>
                    <TableCell>{agendamento.endereco}</TableCell>
                    <TableCell>{agendamento.tecnico || '-'}</TableCell>
                    <TableCell>
                      {agendamento.urgente ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConfirmDialog(agendamento)}
                          className="flex items-center gap-1"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejectDialog(agendamento)}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4 text-red-500" />
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="mt-4">
          {filteredAgendamentos.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="p-6 text-center text-gray-500">
                Nenhum agendamento confirmado para esta data.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableCaption>Lista de agendamentos confirmados</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Urgente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgendamentos.map((agendamento) => (
                  <TableRow key={agendamento.id}>
                    <TableCell className="font-medium">{agendamento.nome}</TableCell>
                    <TableCell>{agendamento.endereco}</TableCell>
                    <TableCell>{agendamento.tecnico || '-'}</TableCell>
                    <TableCell>
                      {agendamento.data_agendada ? (
                        format(new Date(agendamento.data_agendada), "dd/MM/yyyy HH:mm")
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {agendamento.urgente ? (
                        <Badge variant="destructive">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmação */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
            <DialogDescription>
              Confirme a data e horário do agendamento após contato com o cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Cliente
              </Label>
              <div className="col-span-3 font-medium">
                {selectedAgendamento?.nome}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmationDate" className="text-right">
                Data
              </Label>
              <Input
                id="confirmationDate"
                type="date"
                value={confirmationDate}
                onChange={(e) => setConfirmationDate(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmationTime" className="text-right">
                Horário
              </Label>
              <Input
                id="confirmationTime"
                type="time"
                value={confirmationTime}
                onChange={(e) => setConfirmationTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAgendamento} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de rejeição */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Agendamento</DialogTitle>
            <DialogDescription>
              O agendamento será retornado para a lista de pendentes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Cliente
              </Label>
              <div className="col-span-3 font-medium">
                {selectedAgendamento?.nome}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Motivo
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Motivo da rejeição (opcional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejectAgendamento} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Rejeitar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutedAppointmentsManager;
