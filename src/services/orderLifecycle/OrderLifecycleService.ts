import { agendamentosService } from '@/services/agendamentos';
import { ServiceOrder } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { createOrUpdateClient } from '@/services/serviceOrder/mutations/clientOperations/createOrUpdateClient';

/**
 * Serviço para gerenciar o ciclo de vida completo:
 * Agendamento → Roteirização → Confirmação → Ordem de Serviço → Arquivamento
 */
export class OrderLifecycleService {
  
  /**
   * Cria uma ordem de serviço a partir de um agendamento confirmado
   * e marca o agendamento como convertido
   */
  async createServiceOrderFromAgendamento(
    agendamentoId: string | number,
    serviceOrderData: Partial<ServiceOrder>,
    tecnicoId?: string
  ): Promise<{ serviceOrder: ServiceOrder; updatedAgendamento: any }> {
    try {
      console.log(`🚀 Iniciando criação de OS a partir do agendamento ${agendamentoId}`);
      
      // 1. Buscar o agendamento original
      const agendamento = await agendamentosService.getById(agendamentoId);
      if (!agendamento) {
        throw new Error(`Agendamento ${agendamentoId} não encontrado`);
      }

      // 2. Validar se o agendamento pode ser convertido
      if (agendamento.processado) {
        throw new Error(`Agendamento ${agendamentoId} já foi processado`);
      }

      if (agendamento.status === 'convertido') {
        throw new Error(`Agendamento ${agendamentoId} já foi convertido em OS`);
      }

      // 3. Criar ou atualizar cliente (com login automático se tiver email)
      let clientId: string | null = null;
      if (agendamento.nome) {
        try {
          const clientData = {
            name: agendamento.nome,
            email: agendamento.email || null,
            phone: agendamento.telefone || null,
            address: agendamento.endereco || null,
            city: agendamento.cidade || null,
            state: agendamento.estado || null,
            zipCode: agendamento.cep || null
          };

          clientId = await createOrUpdateClient(clientData);
          if (clientId) {
            console.log(`✅ Cliente criado/atualizado com ID: ${clientId}`);
          }
        } catch (clientError) {
          console.error('❌ Erro ao criar/atualizar cliente:', clientError);
          // Continuar com a criação da OS mesmo se falhar a criação do cliente
        }
      }

      // 4. Criar a ordem de serviço
      const now = new Date().toISOString();
      const osData = {
        client_name: agendamento.nome,
        client_phone: agendamento.telefone,
        client_email: agendamento.email || null,
        pickup_address: agendamento.endereco,
        equipment_type: serviceOrderData.equipment || 'Equipamento não especificado',
        description: serviceOrderData.problem_description || 'Problema não especificado',
        status: 'scheduled',
        scheduled_date: agendamento.data_agendada || now,
        technician_id: tecnicoId,
        created_at: now,
        updated_at: now,
        client_id: clientId, // Vincular com o cliente criado
        // Campos específicos do agendamento
        origem_agendamento_id: agendamento.id,
        logistics_group: agendamento.logistica,
        service_type: agendamento.tipo_servico,
        ...serviceOrderData
      };

      console.log('📝 Criando ordem de serviço:', osData);

      const { data: serviceOrder, error } = await supabase
        .from('service_orders')
        .insert(osData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar ordem de serviço:', error);
        throw error;
      }

      console.log(`✅ Ordem de serviço criada com sucesso: ${serviceOrder.id}`);

      // 4. Marcar o agendamento como convertido
      const updatedAgendamento = await agendamentosService.markAsConverted(
        agendamentoId,
        serviceOrder.id,
        tecnicoId
      );

      if (!updatedAgendamento) {
        console.warn(`⚠️ Não foi possível marcar agendamento ${agendamentoId} como convertido`);
      }

      console.log(`🎉 Processo completo: Agendamento ${agendamentoId} → OS ${serviceOrder.id}`);

      return {
        serviceOrder: serviceOrder as ServiceOrder,
        updatedAgendamento
      };

    } catch (error) {
      console.error('❌ Erro no processo de criação de OS:', error);
      throw error;
    }
  }

  /**
   * Obter métricas do ciclo de vida dos agendamentos
   */
  async getLifecycleMetrics(): Promise<{
    pendentes: number;
    roteirizados: number;
    confirmados: number;
    convertidos: number;
    cancelados: number;
    taxa_conversao: number;
    tempo_medio_conversao: number;
  }> {
    try {
      console.log('📊 Calculando métricas do ciclo de vida...');

      const { data, error } = await supabase
        .from('agendamentos_ai')
        .select('status, created_at, data_conversao');

      if (error) {
        console.error('❌ Erro ao buscar dados para métricas:', error);
        throw error;
      }

      const metrics = {
        pendentes: 0,
        roteirizados: 0,
        confirmados: 0,
        convertidos: 0,
        cancelados: 0,
        taxa_conversao: 0,
        tempo_medio_conversao: 0
      };

      if (!data || data.length === 0) {
        return metrics;
      }

      // Contar por status
      data.forEach(item => {
        switch (item.status) {
          case 'pendente':
            metrics.pendentes++;
            break;
          case 'roteirizado':
            metrics.roteirizados++;
            break;
          case 'confirmado':
            metrics.confirmados++;
            break;
          case 'convertido':
            metrics.convertidos++;
            break;
          case 'cancelado':
            metrics.cancelados++;
            break;
        }
      });

      // Calcular taxa de conversão
      const totalProcessados = metrics.convertidos + metrics.cancelados;
      if (totalProcessados > 0) {
        metrics.taxa_conversao = (metrics.convertidos / totalProcessados) * 100;
      }

      // Calcular tempo médio de conversão
      const convertidos = data.filter(item => 
        item.status === 'convertido' && 
        item.created_at && 
        item.data_conversao
      );

      if (convertidos.length > 0) {
        const tempos = convertidos.map(item => {
          const inicio = new Date(item.created_at).getTime();
          const fim = new Date(item.data_conversao!).getTime();
          return (fim - inicio) / (1000 * 60 * 60); // em horas
        });

        metrics.tempo_medio_conversao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      }

      console.log('📊 Métricas calculadas:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Erro ao calcular métricas:', error);
      throw error;
    }
  }

  /**
   * Limpar agendamentos antigos convertidos (housekeeping)
   */
  async cleanupOldConvertedAgendamentos(daysOld: number = 30): Promise<number> {
    try {
      console.log(`🧹 Limpando agendamentos convertidos há mais de ${daysOld} dias...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('agendamentos_ai')
        .delete()
        .eq('status', 'convertido')
        .lt('data_conversao', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('❌ Erro na limpeza:', error);
        throw error;
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ Limpeza concluída: ${deletedCount} agendamentos removidos`);

      return deletedCount;

    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      throw error;
    }
  }

  /**
   * Reverter conversão (rollback) - em caso de erro na OS
   */
  async revertConversion(agendamentoId: string | number): Promise<boolean> {
    try {
      console.log(`🔄 Revertendo conversão do agendamento ${agendamentoId}...`);

      const updateData = {
        status: 'confirmado',
        processado: false,
        data_conversao: null,
        motivo_processamento: null,
        ordem_servico_id: null,
        updated_at: new Date().toISOString()
      };

      const updatedAgendamento = await agendamentosService.update(agendamentoId, updateData);
      
      if (updatedAgendamento) {
        console.log(`✅ Conversão revertida com sucesso para agendamento ${agendamentoId}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Erro ao reverter conversão:', error);
      throw error;
    }
  }

  /**
   * Cria múltiplas ordens de serviço a partir de um pré-agendamento
   * com múltiplos equipamentos e tipos de atendimento
   */
  async createMultipleServiceOrdersFromAgendamento(
    agendamentoId: string | number,
    equipmentGroups: Array<{
      equipments: string[];
      problems: string[];
      attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
      technicianId?: string;
      notes?: string;
      estimatedValue?: number;
    }>
  ): Promise<{ serviceOrders: ServiceOrder[]; updatedAgendamento: any }> {
    try {
      console.log(`🚀 Iniciando criação de múltiplas OS a partir do agendamento ${agendamentoId}`);

      // 1. Buscar o agendamento original
      const agendamento = await agendamentosService.getById(agendamentoId);
      if (!agendamento) {
        throw new Error(`Agendamento ${agendamentoId} não encontrado`);
      }

      // 2. Validar se o agendamento pode ser convertido
      if (agendamento.processado) {
        throw new Error(`Agendamento ${agendamentoId} já foi processado`);
      }

      // 3. Criar ou atualizar cliente (com login automático se tiver email)
      let clientId: string | null = null;
      if (agendamento.nome) {
        try {
          const clientData = {
            name: agendamento.nome,
            email: agendamento.email || null,
            phone: agendamento.telefone || null,
            address: agendamento.endereco || null,
            city: agendamento.cidade || null,
            state: agendamento.estado || null,
            zipCode: agendamento.cep || null
          };

          clientId = await createOrUpdateClient(clientData);
          if (clientId) {
            console.log(`✅ Cliente criado/atualizado com ID: ${clientId}`);
          }
        } catch (clientError) {
          console.error('❌ Erro ao criar/atualizar cliente:', clientError);
          // Continuar com a criação das OS mesmo se falhar a criação do cliente
        }
      }

      const createdOrders: ServiceOrder[] = [];
      const now = new Date().toISOString();

      // 4. Criar uma OS para cada grupo de equipamentos
      for (let i = 0; i < equipmentGroups.length; i++) {
        const group = equipmentGroups[i];

        console.log(`📋 Criando OS ${i + 1}/${equipmentGroups.length} para grupo:`, group);

        // Preparar dados da OS
        const osData = {
          client_name: agendamento.nome,
          client_phone: agendamento.telefone,
          pickup_address: agendamento.endereco,
          client_email: agendamento.email || null,
          client_cpf_cnpj: agendamento.cpf || null,
          client_id: clientId, // Vincular com o cliente criado
          equipment_type: group.equipments.length > 1
            ? `Múltiplos equipamentos (${group.equipments.length})`
            : group.equipments[0],
          description: group.problems.length > 1
            ? group.problems.join('; ')
            : group.problems[0],
          status: 'scheduled',
          scheduled_date: agendamento.data_agendada || now,
          technician_id: group.technicianId || null,
          service_attendance_type: group.attendanceType,
          needs_pickup: group.attendanceType.startsWith('coleta')
        };

        // Inserir OS no banco
        const { data: newOrder, error: orderError } = await supabase
          .from('service_orders')
          .insert([osData])
          .select()
          .single();

        if (orderError) {
          throw new Error(`Erro ao criar OS ${i + 1}: ${orderError.message}`);
        }

        console.log(`✅ OS ${i + 1} criada com sucesso:`, newOrder.id);
        createdOrders.push(newOrder as ServiceOrder);

        // Salvar valor estimado na descrição da OS (não interfere no fluxo de diagnóstico)
        if (group.estimatedValue && group.estimatedValue > 0) {
          const paymentInfo = this.calculateFinalCostForAttendanceType(group.attendanceType, group.estimatedValue);

          // Atualizar descrição com valor estimado e informações de pagamento
          const { error: updateError } = await supabase
            .from('service_orders')
            .update({
              description: `${group.problems.length > 1 ? group.problems.join('; ') : group.problems[0]} | Valor estimado: R$ ${paymentInfo.totalValue.toFixed(2)} | ${paymentInfo.paymentFlow}`
            })
            .eq('id', newOrder.id);

          if (updateError) {
            console.warn(`⚠️ Erro ao atualizar valor da OS ${newOrder.id}:`, updateError);
          } else {
            console.log(`💰 Valor estimado R$ ${paymentInfo.totalValue.toFixed(2)} salvo na OS ${newOrder.id} (${group.attendanceType}) - ${paymentInfo.paymentFlow}`);
          }
        }
      }

      // 4. Marcar agendamento como convertido
      const updatedAgendamento = await agendamentosService.markAsConverted(
        agendamento.id,
        createdOrders[0]?.id || 'multiple_orders'
      );

      console.log(`🎉 ${createdOrders.length} ordens de serviço criadas com sucesso!`);

      return {
        serviceOrders: createdOrders,
        updatedAgendamento
      };

    } catch (error) {
      console.error('❌ Erro ao criar múltiplas OS:', error);
      throw error;
    }
  }

  /**
   * Analisa um pré-agendamento e sugere agrupamentos inteligentes
   * para criação de múltiplas OS
   */
  suggestEquipmentGrouping(agendamento: any): Array<{
    equipments: string[];
    problems: string[];
    attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    reasoning: string;
  }> {
    const equipamentos = Array.isArray(agendamento.equipamentos)
      ? agendamento.equipamentos
      : [agendamento.equipamento].filter(Boolean);

    const problemas = Array.isArray(agendamento.problemas)
      ? agendamento.problemas
      : [agendamento.problema].filter(Boolean);

    const tiposAtendimento = Array.isArray(agendamento.tipos_atendimento)
      ? agendamento.tipos_atendimento
      : [agendamento.tipo_servico].filter(Boolean);

    // Se não há tipos de atendimento específicos, usar lógica padrão
    if (!tiposAtendimento.length || tiposAtendimento.length !== equipamentos.length) {
      return [{
        equipments: equipamentos,
        problems: problemas,
        attendanceType: agendamento.tipo_servico === 'in-home' ? 'em_domicilio' : 'coleta_diagnostico',
        reasoning: 'Agrupamento único - tipos de atendimento não especificados por equipamento'
      }];
    }

    // Agrupar equipamentos por tipo de atendimento
    const groups = new Map<string, {
      equipments: string[];
      problems: string[];
      attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    }>();

    equipamentos.forEach((equipment, index) => {
      const problema = problemas[index] || problemas[0] || 'Problema não especificado';
      const tipo = tiposAtendimento[index] || tiposAtendimento[0] || 'coleta_diagnostico';

      // Normalizar tipo de atendimento
      let normalizedType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
      if (tipo === 'in-home' || tipo === 'em_domicilio') {
        normalizedType = 'em_domicilio';
      } else if (tipo === 'coleta_conserto') {
        normalizedType = 'coleta_conserto';
      } else {
        normalizedType = 'coleta_diagnostico';
      }

      if (!groups.has(normalizedType)) {
        groups.set(normalizedType, {
          equipments: [],
          problems: [],
          attendanceType: normalizedType
        });
      }

      const group = groups.get(normalizedType)!;
      group.equipments.push(equipment);
      group.problems.push(problema);
    });

    // Converter para array com reasoning
    return Array.from(groups.entries()).map(([type, group]) => ({
      ...group,
      reasoning: `Agrupamento por tipo de atendimento: ${type} (${group.equipments.length} equipamento${group.equipments.length > 1 ? 's' : ''})`
    }));
  }

  /**
   * Cria múltiplas ordens de serviço a partir de um pré-agendamento
   * com múltiplos equipamentos e tipos de atendimento
   */
  async createMultipleServiceOrdersFromAgendamento(
    agendamentoId: string | number,
    equipmentGroups: Array<{
      equipments: string[];
      problems: string[];
      attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
      technicianId?: string;
      notes?: string;
      estimatedValue?: number;
    }>,
    scheduledDate?: string,
    scheduledTime?: string
  ): Promise<{ serviceOrders: ServiceOrder[]; updatedAgendamento: any }> {
    try {
      console.log(`🚀 [createMultipleServiceOrdersFromAgendamento] Iniciando criação de múltiplas OS`);
      console.log(`🔍 [createMultipleServiceOrdersFromAgendamento] agendamentoId:`, agendamentoId, 'tipo:', typeof agendamentoId);
      console.log(`🔍 [createMultipleServiceOrdersFromAgendamento] equipmentGroups:`, equipmentGroups);

      // Validar agendamentoId
      if (!agendamentoId || agendamentoId === 'NaN' || (typeof agendamentoId === 'string' && agendamentoId === 'NaN')) {
        console.error(`❌ [createMultipleServiceOrdersFromAgendamento] ID do agendamento inválido:`, agendamentoId);
        throw new Error(`ID do agendamento inválido: ${agendamentoId}`);
      }

      // 1. Buscar o agendamento original
      console.log(`🔍 [createMultipleServiceOrdersFromAgendamento] Buscando agendamento...`);
      const agendamento = await agendamentosService.getById(agendamentoId);
      if (!agendamento) {
        console.error(`❌ [createMultipleServiceOrdersFromAgendamento] Agendamento não encontrado:`, agendamentoId);
        throw new Error(`Agendamento ${agendamentoId} não encontrado`);
      }

      console.log(`✅ [createMultipleServiceOrdersFromAgendamento] Agendamento encontrado:`, agendamento.nome);

      // 2. Validar se o agendamento pode ser convertido
      if (agendamento.processado) {
        throw new Error(`Agendamento ${agendamentoId} já foi processado`);
      }

      // 3. Criar ou atualizar cliente (com login automático se tiver email)
      let clientId: string | null = null;
      if (agendamento.nome) {
        try {
          const clientData = {
            name: agendamento.nome,
            email: agendamento.email || null,
            phone: agendamento.telefone || null,
            address: agendamento.endereco || null,
            city: agendamento.cidade || null,
            state: agendamento.estado || null,
            zipCode: agendamento.cep || null
          };

          clientId = await createOrUpdateClient(clientData);
          if (clientId) {
            console.log(`✅ [createMultipleServiceOrdersFromAgendamento] Cliente criado/atualizado com ID: ${clientId}`);
          }
        } catch (clientError) {
          console.error('❌ [createMultipleServiceOrdersFromAgendamento] Erro ao criar/atualizar cliente:', clientError);
          // Continuar com a criação das OS mesmo se falhar a criação do cliente
        }
      }

      const createdOrders: ServiceOrder[] = [];
      const now = new Date().toISOString();

      // 4. Criar uma OS para cada grupo de equipamentos
      for (let i = 0; i < equipmentGroups.length; i++) {
        const group = equipmentGroups[i];

        console.log(`📋 Criando OS ${i + 1}/${equipmentGroups.length} para grupo:`, group);

        // Preparar dados da OS
        const osData = {
          client_name: agendamento.nome,
          client_phone: agendamento.telefone,
          pickup_address: agendamento.endereco,
          client_email: agendamento.email || null,
          client_cpf_cnpj: agendamento.cpf || null,
          client_id: clientId, // Vincular com o cliente criado
          equipment_type: group.equipments.length > 1
            ? `Múltiplos equipamentos (${group.equipments.length})`
            : group.equipments[0],
          description: group.problems.length > 1
            ? group.problems.join('; ')
            : group.problems[0],
          status: 'scheduled',
          scheduled_date: scheduledDate || agendamento.data_agendada || now,
          technician_id: group.technicianId || null,
          service_attendance_type: group.attendanceType,
          needs_pickup: group.attendanceType.startsWith('coleta')
        };

        // Inserir OS no banco
        const { data: newOrder, error: orderError } = await supabase
          .from('service_orders')
          .insert([osData])
          .select()
          .single();

        if (orderError) {
          throw new Error(`Erro ao criar OS ${i + 1}: ${orderError.message}`);
        }

        console.log(`✅ OS ${i + 1} criada com sucesso:`, newOrder.id);
        createdOrders.push(newOrder as ServiceOrder);

        // Salvar valor estimado na descrição da OS (não interfere no fluxo de diagnóstico)
        if (group.estimatedValue && group.estimatedValue > 0) {
          const paymentInfo = this.calculateFinalCostForAttendanceType(group.attendanceType, group.estimatedValue);

          // Atualizar descrição com valor estimado e informações de pagamento
          const { error: updateError } = await supabase
            .from('service_orders')
            .update({
              description: `${group.problems.length > 1 ? group.problems.join('; ') : group.problems[0]} | Valor estimado: R$ ${paymentInfo.totalValue.toFixed(2)} | ${paymentInfo.paymentFlow}`
            })
            .eq('id', newOrder.id);

          if (updateError) {
            console.warn(`⚠️ Erro ao atualizar valor da OS ${newOrder.id}:`, updateError);
          } else {
            console.log(`💰 Valor estimado R$ ${paymentInfo.totalValue.toFixed(2)} salvo na OS ${newOrder.id} (${group.attendanceType}) - ${paymentInfo.paymentFlow}`);
          }
        }
      }

      // 4. Marcar agendamento como convertido
      const updatedAgendamento = await agendamentosService.markAsConverted(
        agendamento.id,
        createdOrders[0]?.id || 'multiple_orders'
      );

      console.log(`🎉 ${createdOrders.length} ordens de serviço criadas com sucesso!`);

      return {
        serviceOrders: createdOrders,
        updatedAgendamento
      };

    } catch (error) {
      console.error('❌ Erro ao criar múltiplas OS:', error);
      throw error;
    }
  }

  /**
   * Calcula o custo final baseado no tipo de atendimento e valor estimado
   * Considera os diferentes fluxos de pagamento de cada tipo de serviço
   */
  private calculateFinalCostForAttendanceType(attendanceType: string, estimatedValue: number): {
    totalValue: number;
    paymentFlow: string;
    firstPayment: number;
    secondPayment?: number;
  } {
    switch (attendanceType) {
      case 'coleta_diagnostico':
        // Coleta Diagnóstico: Valor personalizado na coleta + orçamento será definido depois
        return {
          totalValue: estimatedValue,
          paymentFlow: '2 etapas: R$ ' + estimatedValue.toFixed(2) + ' na coleta + orçamento na entrega',
          firstPayment: estimatedValue,
          secondPayment: 0 // Orçamento será definido pela oficina
        };

      case 'coleta_conserto':
        // Coleta Conserto: 50% na coleta + 50% na entrega (2 etapas)
        const halfValue = estimatedValue / 2;
        return {
          totalValue: estimatedValue,
          paymentFlow: '2 etapas: 50% na coleta + 50% na entrega',
          firstPayment: halfValue,
          secondPayment: halfValue
        };

      case 'em_domicilio':
      default:
        // Em Domicílio: 100% na conclusão (1 etapa)
        return {
          totalValue: estimatedValue,
          paymentFlow: '1 etapa: 100% na conclusão do serviço',
          firstPayment: estimatedValue
        };
    }
  }

  /**
   * Analisa um pré-agendamento e detecta se possui múltiplos equipamentos
   */
  hasMultipleEquipments(agendamento: any): boolean {
    console.log('🔍 [hasMultipleEquipments] Agendamento:', agendamento.nome);
    console.log('🔍 [hasMultipleEquipments] agendamento.equipamentos:', agendamento.equipamentos, 'tipo:', typeof agendamento.equipamentos);
    console.log('🔍 [hasMultipleEquipments] agendamento.equipamento:', agendamento.equipamento);

    let equipamentos: string[] = [];

    if (Array.isArray(agendamento.equipamentos)) {
      // Caso 1: Array real do PostgreSQL (como Cliente Teste Multiplos)
      equipamentos = agendamento.equipamentos;
    } else if (typeof agendamento.equipamentos === 'string' && agendamento.equipamentos.startsWith('[')) {
      // Caso 2: String JSON (como Lorena Piacente)
      try {
        equipamentos = JSON.parse(agendamento.equipamentos);
      } catch (e) {
        console.error('Erro ao fazer parse do JSON de equipamentos:', e);
        equipamentos = [agendamento.equipamento].filter(Boolean);
      }
    } else {
      // Caso 3: Fallback para equipamento único
      equipamentos = [agendamento.equipamento].filter(Boolean);
    }

    console.log('🔍 [hasMultipleEquipments] equipamentos processados:', equipamentos, 'length:', equipamentos.length);
    const result = equipamentos.length > 1;
    console.log('🎯 [hasMultipleEquipments] resultado:', result);

    return result;
  }


}

// Instância singleton
export const orderLifecycleService = new OrderLifecycleService();
