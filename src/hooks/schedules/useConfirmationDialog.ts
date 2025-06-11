
import { useState } from 'react';
import { AgendamentoAI } from '@/services/agendamentos';
import { toast } from 'sonner';
import { technicianService } from '@/services/technician/technicianService';
import { ServiceOrder } from '@/types';

interface UseConfirmationDialogProps {
  updateAgendamento: (id: string, updates: Partial<AgendamentoAI>) => Promise<boolean>;
  filteredAgendamentos: AgendamentoAI[];
  setFilteredAgendamentos: React.Dispatch<React.SetStateAction<AgendamentoAI[]>>;
}

export const useConfirmationDialog = ({
  updateAgendamento,
  filteredAgendamentos,
  setFilteredAgendamentos
}: UseConfirmationDialogProps) => {
  // Estado para diálogos de confirmação
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    agendamentoId: "",
    agendamentoNome: "",
    agendamentoEndereco: "",
    title: "",
    description: "",
    actionText: "",
    actionType: 'confirm' as 'confirm' | 'reschedule' | 'cancel' | 'route' | 'createOrder',
    onConfirm: (technicianId?: string) => {}
  });

  // Estado para diálogo de roteirização
  const [routingDialog, setRoutingDialog] = useState({
    isOpen: false,
    agendamentoId: "",
    agendamentoNome: "",
    agendamentoEndereco: "",
    title: "",
    description: "",
    actionText: "",
  });

  // Estado para diálogo de criação de ordem de serviço
  const [createOrderDialog, setCreateOrderDialog] = useState({
    isOpen: false,
    agendamento: null as AgendamentoAI | null,
  });

  // Funções para abrir os diálogos de confirmação
  const openConfirmDialog = (agendamento: AgendamentoAI) => {
    setConfirmationDialog({
      isOpen: true,
      agendamentoId: agendamento.id,
      agendamentoNome: agendamento.nome,
      agendamentoEndereco: agendamento.endereco,
      title: "Confirmar agendamento",
      description: "Você está prestes a confirmar este agendamento. Selecione um técnico para prosseguir.",
      actionText: "Confirmar",
      actionType: 'confirm',
      onConfirm: (technicianId?: string) => performConfirm(agendamento.id, technicianId)
    });
  };

  const openRescheduleDialog = (agendamento: AgendamentoAI) => {
    setConfirmationDialog({
      isOpen: true,
      agendamentoId: agendamento.id,
      agendamentoNome: agendamento.nome,
      agendamentoEndereco: agendamento.endereco,
      title: "Reagendar atendimento",
      description: "Você está prestes a reagendar este atendimento. O status permanecerá como 'pendente' até que uma nova data seja definida.",
      actionText: "Reagendar",
      actionType: 'reschedule',
      onConfirm: () => performReschedule(agendamento.id)
    });
  };

  const openCancelDialog = (agendamento: AgendamentoAI) => {
    setConfirmationDialog({
      isOpen: true,
      agendamentoId: agendamento.id,
      agendamentoNome: agendamento.nome,
      agendamentoEndereco: agendamento.endereco,
      title: "Cancelar agendamento",
      description: "Você está prestes a cancelar este agendamento. Esta ação não pode ser desfeita.",
      actionText: "Cancelar agendamento",
      actionType: 'cancel',
      onConfirm: () => performCancel(agendamento.id)
    });
  };

  // Função para abrir o diálogo de roteirização
  const openRoutingDialog = (agendamento: AgendamentoAI) => {
    setRoutingDialog({
      isOpen: true,
      agendamentoId: agendamento.id,
      agendamentoNome: agendamento.nome,
      agendamentoEndereco: agendamento.endereco,
      title: "Roteirizar agendamento",
      description: "Defina a data e hora para este agendamento.",
      actionText: "Roteirizar",
    });
  };

  // Função para abrir o diálogo de criação de ordem de serviço
  const openCreateOrderDialog = (agendamento: AgendamentoAI) => {
    setCreateOrderDialog({
      isOpen: true,
      agendamento,
    });
  };

  // Funções para fechar os diálogos
  const closeDialog = () => {
    setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
  };

  const closeRoutingDialog = () => {
    setRoutingDialog(prev => ({ ...prev, isOpen: false }));
  };

  const closeCreateOrderDialog = () => {
    setCreateOrderDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Funções que realmente executam as ações após confirmação
  const performConfirm = async (agendamentoId: string, technicianId?: string) => {
    try {
      if (!technicianId) {
        toast.error('É necessário selecionar um técnico para confirmar o agendamento.');
        return;
      }

      // Buscar o nome do técnico para atualização local
      let technicianName = "Técnico designado";
      try {
        const technician = await technicianService.getById(technicianId);
        if (technician) {
          technicianName = technician.name;
        }
      } catch (error) {
        console.error('Erro ao buscar nome do técnico:', error);
      }

      // Para agendamentos de exemplo, apenas atualize localmente
      if (["1", "2", "3"].includes(agendamentoId)) {
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? {
            ...ag,
            status: 'confirmado',
            tecnico: technicianName
          } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento confirmado com sucesso!');
        closeDialog();
        return;
      }

      const success = await updateAgendamento(agendamentoId, {
        status: 'confirmado',
        tecnico: technicianName
      });

      if (success) {
        // Atualiza a lista local de agendamentos sem recarregar a página
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? {
            ...ag,
            status: 'confirmado',
            tecnico: technicianName
          } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento confirmado com sucesso!');
      } else {
        toast.error('Erro ao confirmar agendamento');
      }
      closeDialog();
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('Erro ao confirmar agendamento');
      closeDialog();
    }
  };

  const performReschedule = async (agendamentoId: string) => {
    try {
      // Para agendamentos de exemplo, apenas atualize localmente
      if (["1", "2", "3"].includes(agendamentoId)) {
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? { ...ag, status: 'reagendado' } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento reagendado com sucesso!');
        closeDialog();
        return;
      }

      const success = await updateAgendamento(agendamentoId, { status: 'reagendado' });
      if (success) {
        // Atualiza a lista local de agendamentos sem recarregar a página
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? { ...ag, status: 'reagendado' } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento reagendado com sucesso!');
      } else {
        toast.error('Erro ao reagendar agendamento');
      }
      closeDialog();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Erro ao reagendar agendamento');
      closeDialog();
    }
  };

  const performCancel = async (agendamentoId: string) => {
    try {
      // Para agendamentos de exemplo, apenas atualize localmente
      if (["1", "2", "3"].includes(agendamentoId)) {
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? { ...ag, status: 'cancelado' } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento cancelado!');
        closeDialog();
        return;
      }

      const success = await updateAgendamento(agendamentoId, { status: 'cancelado' });
      if (success) {
        // Atualiza a lista local de agendamentos sem recarregar a página
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? { ...ag, status: 'cancelado' } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento cancelado!');
      } else {
        toast.error('Erro ao cancelar agendamento');
      }
      closeDialog();
    } catch (error) {
      console.error('Error canceling appointment:', error);
      toast.error('Erro ao cancelar agendamento');
      closeDialog();
    }
  };

  // Função para roteirizar um agendamento
  const performRouting = async (agendamentoId: string, scheduledDate: string) => {
    try {
      // Para agendamentos de exemplo, apenas atualize localmente
      if (["1", "2", "3"].includes(agendamentoId)) {
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? {
            ...ag,
            status: 'roteirizado',
            data_agendada: scheduledDate
          } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento roteirizado com sucesso!');
        closeRoutingDialog();
        return;
      }

      const success = await updateAgendamento(agendamentoId, {
        status: 'roteirizado',
        data_agendada: scheduledDate
      });

      if (success) {
        // Atualiza a lista local de agendamentos sem recarregar a página
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? {
            ...ag,
            status: 'roteirizado',
            data_agendada: scheduledDate
          } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);
        toast.success('Agendamento roteirizado com sucesso!');
      } else {
        toast.error('Erro ao roteirizar agendamento');
      }
      closeRoutingDialog();
    } catch (error) {
      console.error('Error routing appointment:', error);
      toast.error('Erro ao roteirizar agendamento');
      closeRoutingDialog();
    }
  };

  // Função para criar uma ordem de serviço a partir de um agendamento
  const performCreateServiceOrder = async (
    agendamentoId: string,
    scheduledDate: string | null,
    scheduledTime: string | null,
    existingClientId?: string
  ) => {
    try {
      // Encontrar o agendamento
      const agendamento = filteredAgendamentos.find(ag => ag.id === agendamentoId);
      if (!agendamento) {
        toast.error('Agendamento não encontrado');
        closeCreateOrderDialog();
        return;
      }

      // Validar data e hora
      if (!scheduledDate) {
        toast.error('É necessário definir uma data para o agendamento');
        return;
      }

      // Para agendamentos de exemplo, apenas simule a criação
      if (["1", "2", "3"].includes(agendamentoId)) {
        toast.success('Ordem de serviço criada com sucesso!');
        closeCreateOrderDialog();
        return;
      }

      // Importar o serviço de ordens de serviço
      const { serviceOrderService } = await import('@/services');
      const { v4: uuidv4 } = await import('uuid');

      // Determinar o tipo de atendimento com base no agendamento
      let serviceAttendanceType = 'coleta_conserto'; // Valor padrão

      // Se for coifa ou exaustor, o atendimento é em domicílio
      if (
        agendamento.equipamento.toLowerCase().includes('coifa') ||
        agendamento.equipamento.toLowerCase().includes('exaustor')
      ) {
        serviceAttendanceType = 'em_domicilio';
      }

      // Se for fogão, geladeira ou máquina de lavar e o problema for simples, pode ser em domicílio
      else if (
        (agendamento.equipamento.toLowerCase().includes('fogão') ||
         agendamento.equipamento.toLowerCase().includes('geladeira') ||
         agendamento.equipamento.toLowerCase().includes('máquina de lavar')) &&
        (agendamento.problema.toLowerCase().includes('simples') ||
         agendamento.problema.toLowerCase().includes('ajuste') ||
         agendamento.problema.toLowerCase().includes('regulagem'))
      ) {
        serviceAttendanceType = 'em_domicilio';
      }

      // Se o problema mencionar diagnóstico, o atendimento é coleta para diagnóstico
      else if (
        agendamento.problema.toLowerCase().includes('diagnóstico') ||
        agendamento.problema.toLowerCase().includes('diagnostico') ||
        agendamento.problema.toLowerCase().includes('não sei') ||
        agendamento.problema.toLowerCase().includes('nao sei') ||
        agendamento.problema.toLowerCase().includes('verificar')
      ) {
        serviceAttendanceType = 'coleta_diagnostico';
      }

      // Extrair informações do endereço
      const addressParts = agendamento.endereco.split(',');
      let pickupCity = null;
      let pickupState = null;
      let pickupZipCode = null;

      // Tentar extrair cidade e estado do endereço
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1].trim();
        const cityStateParts = lastPart.split('-');

        if (cityStateParts.length >= 2) {
          pickupCity = cityStateParts[0].trim();

          // O estado pode ter um CEP após ele
          const stateZipParts = cityStateParts[1].trim().split(' ');
          pickupState = stateZipParts[0].trim();

          if (stateZipParts.length >= 2) {
            pickupZipCode = stateZipParts[1].trim();
          }
        }
      }

      // Função para extrair modelo do equipamento
      const extractEquipmentModel = (equipment: string) => {
        if (equipment.includes(' - ')) {
          const parts = equipment.split(' - ');
          return parts[1].trim();
        }
        return null;
      };

      // Função para determinar o tipo de atendimento com base no equipamento e problema
      const determineAttendanceType = (equipment: string, problem: string) => {
        // Se for coifa ou exaustor, o atendimento é em domicílio
        if (
          equipment.toLowerCase().includes('coifa') ||
          equipment.toLowerCase().includes('exaustor')
        ) {
          return 'em_domicilio';
        }

        // Se for fogão, geladeira ou máquina de lavar e o problema for simples, pode ser em domicílio
        else if (
          (equipment.toLowerCase().includes('fogão') ||
           equipment.toLowerCase().includes('geladeira') ||
           equipment.toLowerCase().includes('máquina de lavar')) &&
          (problem.toLowerCase().includes('simples') ||
           problem.toLowerCase().includes('ajuste') ||
           problem.toLowerCase().includes('regulagem'))
        ) {
          return 'em_domicilio';
        }

        // Se o problema mencionar diagnóstico, o atendimento é coleta para diagnóstico
        else if (
          problem.toLowerCase().includes('diagnóstico') ||
          problem.toLowerCase().includes('diagnostico') ||
          problem.toLowerCase().includes('não sei') ||
          problem.toLowerCase().includes('nao sei') ||
          problem.toLowerCase().includes('verificar')
        ) {
          return 'coleta_diagnostico';
        }

        // Padrão é coleta para conserto
        return 'coleta_conserto';
      };

      // Preparar os itens de serviço
      const serviceItems = [];

      // Verificar se temos múltiplos equipamentos
      if (agendamento.equipamentos && typeof agendamento.equipamentos === 'string') {
        try {
          const equipamentos = JSON.parse(agendamento.equipamentos);
          const problemas = agendamento.problemas ? JSON.parse(agendamento.problemas) : [];

          if (Array.isArray(equipamentos) && equipamentos.length > 0) {
            // Iterar sobre cada equipamento
            equipamentos.forEach((equipamento, index) => {
              const problema = problemas[index] || 'Não especificado';

              // Extrair tipo e modelo do equipamento
              let equipmentType = equipamento;
              let equipmentModel = extractEquipmentModel(equipamento);

              if (equipmentModel) {
                equipmentType = equipamento.split(' - ')[0].trim();
              }

              // Determinar o tipo de atendimento para este equipamento
              const itemAttendanceType = determineAttendanceType(equipamento, problema);

              // Adicionar o item à ordem de serviço
              serviceItems.push({
                id: uuidv4(),
                serviceOrderId: '',
                serviceType: 'repair',
                serviceAttendanceType: itemAttendanceType,
                equipmentType: equipmentType,
                equipmentModel: equipmentModel,
                equipmentSerial: null,
                clientDescription: problema,
                serviceValue: ''
              });
            });
          }
        } catch (error) {
          console.error('Erro ao processar equipamentos:', error);
          // Fallback para um único equipamento
          const equipmentType = agendamento.equipamento;
          const equipmentModel = extractEquipmentModel(equipmentType);

          serviceItems.push({
            id: uuidv4(),
            serviceOrderId: '',
            serviceType: 'repair',
            serviceAttendanceType,
            equipmentType: equipmentModel ? equipmentType.split(' - ')[0].trim() : equipmentType,
            equipmentModel: equipmentModel,
            equipmentSerial: null,
            clientDescription: agendamento.problema,
            serviceValue: ''
          });
        }
      } else {
        // Comportamento para um único equipamento
        const equipmentType = agendamento.equipamento;
        const equipmentModel = extractEquipmentModel(equipmentType);

        serviceItems.push({
          id: uuidv4(),
          serviceOrderId: '',
          serviceType: 'repair',
          serviceAttendanceType,
          equipmentType: equipmentModel ? equipmentType.split(' - ')[0].trim() : equipmentType,
          equipmentModel: equipmentModel,
          equipmentSerial: null,
          clientDescription: agendamento.problema,
          serviceValue: ''
        });
      }

      // Determinar o tipo de atendimento principal com base nos itens
      // Se houver pelo menos um item de coleta, toda a ordem é de coleta
      const hasPickupItem = serviceItems.some(item =>
        item.serviceAttendanceType === 'coleta_conserto' ||
        item.serviceAttendanceType === 'coleta_diagnostico'
      );

      const mainServiceAttendanceType = hasPickupItem ?
        (serviceItems.some(item => item.serviceAttendanceType === 'coleta_diagnostico') ?
          'coleta_diagnostico' : 'coleta_conserto') :
        'em_domicilio';

      // Criar a data completa a partir da data e hora fornecidas
      let fullScheduledDate = null;
      if (scheduledDate) {
        try {
          // Criar data a partir dos campos separados
          const dateStr = scheduledDate;
          const timeStr = scheduledTime || '12:00'; // Usar meio-dia como padrão se não houver hora

          // Combinar data e hora
          const dateTimeStr = `${dateStr}T${timeStr}:00`;
          fullScheduledDate = new Date(dateTimeStr).toISOString();
        } catch (error) {
          console.error('Erro ao processar data e hora:', error);
          toast.error('Formato de data ou hora inválido');
          return;
        }
      }

      // Criar a ordem de serviço
      const serviceOrder = {
        id: uuidv4(),
        clientId: existingClientId || null,
        clientName: agendamento.nome,
        clientEmail: agendamento.email || null,
        clientPhone: agendamento.telefone || null,
        clientCpfCnpj: agendamento.cpf || null,
        clientAddressComplement: null,
        clientAddressReference: null,
        technicianId: null,
        technicianName: agendamento.tecnico || null,
        // Se tiver data agendada, usar status 'scheduled', caso contrário 'pending'
        status: fullScheduledDate ? 'scheduled' : 'pending',
        createdAt: new Date().toISOString(),
        scheduledDate: fullScheduledDate,
        scheduledTime: scheduledTime || null,
        completedDate: null,
        description: serviceItems.length > 1 ?
          `Múltiplos equipamentos (${serviceItems.length})` :
          agendamento.problema,
        equipmentType: serviceItems.length > 1 ?
          `Múltiplos equipamentos (${serviceItems.length})` :
          serviceItems[0]?.equipmentType || agendamento.equipamento,
        equipmentModel: serviceItems.length > 1 ?
          null :
          serviceItems[0]?.equipmentModel,
        equipmentSerial: null,
        needsPickup: mainServiceAttendanceType !== 'em_domicilio',
        pickupAddress: agendamento.endereco,
        pickupCity: pickupCity,
        pickupState: pickupState,
        pickupZipCode: pickupZipCode,
        currentLocation: 'client',
        serviceAttendanceType: mainServiceAttendanceType,
        clientDescription: serviceItems.length > 1 ?
          `Múltiplos equipamentos (${serviceItems.length})` :
          agendamento.problema,
        images: [],
        serviceItems: serviceItems
      };

      console.log('Criando ordem de serviço a partir do agendamento:', serviceOrder);

      // Criar a ordem de serviço
      const orderId = await serviceOrderService.create(serviceOrder);

      if (!orderId) {
        toast.error('Erro ao criar ordem de serviço');
        closeCreateOrderDialog();
        return;
      }

      // Atualizar o status do agendamento para indicar que uma ordem de serviço foi criada
      const success = await updateAgendamento(agendamentoId, {
        status: 'os_criada'
      });

      if (success) {
        // Atualizar a lista local de agendamentos
        const updatedAgendamentos = filteredAgendamentos.map(ag =>
          ag.id === agendamentoId ? { ...ag, status: 'os_criada' } : ag
        );
        setFilteredAgendamentos(updatedAgendamentos);

        toast.success('Ordem de serviço criada com sucesso!');
      } else {
        toast.warning('Ordem de serviço criada, mas não foi possível atualizar o status do agendamento');
      }

      closeCreateOrderDialog();
    } catch (error) {
      console.error('Error creating service order:', error);
      toast.error('Erro ao criar ordem de serviço');
      closeCreateOrderDialog();
    }
  };

  return {
    confirmationDialog,
    routingDialog,
    createOrderDialog,
    openConfirmDialog,
    openRescheduleDialog,
    openCancelDialog,
    openRoutingDialog,
    openCreateOrderDialog,
    closeDialog,
    closeRoutingDialog,
    closeCreateOrderDialog,
    performRouting,
    performCreateServiceOrder
  };
};

export default useConfirmationDialog;
