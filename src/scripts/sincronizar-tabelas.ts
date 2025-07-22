#!/usr/bin/env tsx
/**
 * 🔧 Script para sincronizar service_orders com scheduled_services
 * 
 * Este script:
 * 1. Analisa inconsistências entre as tabelas
 * 2. Cria agendamentos para OS órfãs
 * 3. Remove agendamentos órfãos
 * 4. Corrige dados inconsistentes
 */

import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ServiceOrder {
  id: string;
  order_number: string | null;
  client_id: string | null;
  client_name: string;
  technician_id: string | null;
  technician_name: string | null;
  scheduled_date: string | null;
  pickup_address: string | null;
  equipment_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface ScheduledService {
  id: string;
  service_order_id: string | null;
  technician_id: string;
  technician_name: string;
  client_id: string | null;
  client_name: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  address: string;
  description: string;
  status: string;
}

class TabelaSincronizador {
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    console.log(`🔧 Iniciando sincronização (${dryRun ? 'DRY RUN' : 'EXECUÇÃO REAL'})`);
  }

  /**
   * Análise completa das tabelas
   */
  async analisar(): Promise<void> {
    console.log('\n📊 ANÁLISE DAS TABELAS');
    console.log('='.repeat(50));

    // 1. Contar registros
    await this.contarRegistros();

    // 2. Identificar OS órfãs
    const osOrfas = await this.identificarOSOrfas();

    // 3. Identificar agendamentos órfãos
    const agendamentosOrfaos = await this.identificarAgendamentosOrfaos();

    // 4. Verificar duplicações
    await this.verificarDuplicacoes();

    // 5. Verificar inconsistências
    await this.verificarInconsistencias();

    console.log('\n📋 RESUMO DA ANÁLISE');
    console.log('-'.repeat(30));
    console.log(`📦 OS órfãs (sem agendamento): ${osOrfas.length}`);
    console.log(`👻 Agendamentos órfãos: ${agendamentosOrfaos.length}`);
  }

  /**
   * Contar registros nas tabelas
   */
  private async contarRegistros(): Promise<void> {
    const { data: serviceOrders } = await supabase
      .from('service_orders')
      .select('id, scheduled_date, technician_id')
      .not('scheduled_date', 'is', null)
      .not('technician_id', 'is', null);

    const { data: scheduledServices } = await supabase
      .from('scheduled_services')
      .select('id, service_order_id');

    console.log(`📦 service_orders com agendamento: ${serviceOrders?.length || 0}`);
    console.log(`📅 scheduled_services: ${scheduledServices?.length || 0}`);
  }

  /**
   * Identificar OS que têm agendamento mas não têm registro em scheduled_services
   */
  private async identificarOSOrfas(): Promise<ServiceOrder[]> {
    const { data: osOrfas, error } = await supabase
      .from('service_orders')
      .select(`
        id, order_number, client_id, client_name, technician_id, technician_name,
        scheduled_date, pickup_address, equipment_type, description, status, created_at
      `)
      .not('scheduled_date', 'is', null)
      .not('technician_id', 'is', null)
      .not('technician_name', 'is', null)
      .not('status', 'in', '(cancelled,completed)');

    if (error) {
      console.error('❌ Erro ao buscar OS:', error);
      return [];
    }

    // Filtrar apenas as que não têm agendamento
    const osComAgendamento = new Set();
    const { data: agendamentos } = await supabase
      .from('scheduled_services')
      .select('service_order_id')
      .not('service_order_id', 'is', null);

    agendamentos?.forEach(a => osComAgendamento.add(a.service_order_id));

    const orfas = osOrfas?.filter(os => !osComAgendamento.has(os.id)) || [];

    console.log(`\n🔍 OS ÓRFÃS (${orfas.length}):`);
    orfas.forEach(os => {
      console.log(`  📦 ${os.order_number || os.id.slice(0, 8)} - ${os.client_name} - ${format(new Date(os.scheduled_date!), 'dd/MM/yyyy')}`);
    });

    return orfas;
  }

  /**
   * Identificar agendamentos órfãos (sem OS vinculada ou com OS finalizada)
   */
  private async identificarAgendamentosOrfaos(): Promise<ScheduledService[]> {
    const { data: agendamentos, error } = await supabase
      .from('scheduled_services')
      .select(`
        id, service_order_id, technician_name, client_name,
        scheduled_start_time, status
      `);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      return [];
    }

    const orfaos: ScheduledService[] = [];

    for (const agendamento of agendamentos || []) {
      if (!agendamento.service_order_id) {
        orfaos.push(agendamento as ScheduledService);
        continue;
      }

      // Verificar se a OS existe e está ativa
      const { data: os } = await supabase
        .from('service_orders')
        .select('id, status')
        .eq('id', agendamento.service_order_id)
        .single();

      if (!os || ['cancelled', 'completed'].includes(os.status)) {
        orfaos.push(agendamento as ScheduledService);
      }
    }

    console.log(`\n👻 AGENDAMENTOS ÓRFÃOS (${orfaos.length}):`);
    orfaos.forEach(ag => {
      console.log(`  📅 ${ag.id.slice(0, 8)} - ${ag.client_name} - ${format(new Date(ag.scheduled_start_time), 'dd/MM/yyyy')}`);
    });

    return orfaos;
  }

  /**
   * Verificar duplicações (mesma OS com múltiplos agendamentos)
   */
  private async verificarDuplicacoes(): Promise<void> {
    const { data: duplicacoes, error } = await supabase.rpc('verificar_duplicacoes_agendamento');

    if (error) {
      console.log('⚠️ Função de verificação de duplicações não encontrada - pulando...');
      return;
    }

    console.log(`\n🔄 DUPLICAÇÕES ENCONTRADAS: ${duplicacoes?.length || 0}`);
  }

  /**
   * Verificar inconsistências de dados
   */
  private async verificarInconsistencias(): Promise<void> {
    const { data: inconsistencias, error } = await supabase
      .from('service_orders')
      .select(`
        id, client_name, technician_id, scheduled_date,
        scheduled_services!service_order_id(client_name, technician_id, scheduled_start_time)
      `)
      .not('scheduled_date', 'is', null);

    if (error) {
      console.error('❌ Erro ao verificar inconsistências:', error);
      return;
    }

    let inconsistenciasEncontradas = 0;
    inconsistencias?.forEach(os => {
      const agendamento = (os as any).scheduled_services?.[0];
      if (agendamento) {
        if (os.client_name !== agendamento.client_name) {
          console.log(`⚠️ Nome diferente: OS ${os.id.slice(0, 8)} - "${os.client_name}" vs "${agendamento.client_name}"`);
          inconsistenciasEncontradas++;
        }
        if (os.technician_id !== agendamento.technician_id) {
          console.log(`⚠️ Técnico diferente: OS ${os.id.slice(0, 8)}`);
          inconsistenciasEncontradas++;
        }
      }
    });

    console.log(`\n⚠️ INCONSISTÊNCIAS ENCONTRADAS: ${inconsistenciasEncontradas}`);
  }

  /**
   * Sincronizar as tabelas
   */
  async sincronizar(): Promise<void> {
    console.log('\n🔧 INICIANDO SINCRONIZAÇÃO');
    console.log('='.repeat(50));

    // 1. Criar agendamentos para OS órfãs
    await this.criarAgendamentosParaOSOrfas();

    // 2. Limpar agendamentos órfãos
    await this.limparAgendamentosOrfaos();

    // 3. Corrigir inconsistências
    await this.corrigirInconsistencias();

    console.log('\n✅ SINCRONIZAÇÃO CONCLUÍDA');
  }

  /**
   * Criar agendamentos para OS órfãs
   */
  private async criarAgendamentosParaOSOrfas(): Promise<void> {
    const osOrfas = await this.identificarOSOrfas();

    if (osOrfas.length === 0) {
      console.log('✅ Nenhuma OS órfã encontrada');
      return;
    }

    console.log(`\n📦 Criando agendamentos para ${osOrfas.length} OS órfãs...`);

    for (const os of osOrfas) {
      const agendamentoData = {
        service_order_id: os.id,
        technician_id: os.technician_id!,
        technician_name: os.technician_name!,
        client_id: os.client_id,
        client_name: os.client_name,
        scheduled_start_time: os.scheduled_date!,
        scheduled_end_time: new Date(new Date(os.scheduled_date!).getTime() + 60 * 60 * 1000).toISOString(),
        address: os.pickup_address || 'Endereço não informado',
        description: `${os.equipment_type} - ${os.description}`,
        status: 'scheduled'
      };

      if (this.dryRun) {
        console.log(`  🔍 [DRY RUN] Criaria agendamento para OS ${os.order_number || os.id.slice(0, 8)}`);
      } else {
        const { error } = await supabase
          .from('scheduled_services')
          .insert(agendamentoData);

        if (error) {
          console.error(`  ❌ Erro ao criar agendamento para OS ${os.id}:`, error.message);
        } else {
          console.log(`  ✅ Agendamento criado para OS ${os.order_number || os.id.slice(0, 8)}`);
        }
      }
    }
  }

  /**
   * Limpar agendamentos órfãos
   */
  private async limparAgendamentosOrfaos(): Promise<void> {
    const agendamentosOrfaos = await this.identificarAgendamentosOrfaos();

    if (agendamentosOrfaos.length === 0) {
      console.log('✅ Nenhum agendamento órfão encontrado');
      return;
    }

    console.log(`\n👻 Removendo ${agendamentosOrfaos.length} agendamentos órfãos...`);

    for (const agendamento of agendamentosOrfaos) {
      if (this.dryRun) {
        console.log(`  🔍 [DRY RUN] Removeria agendamento ${agendamento.id.slice(0, 8)}`);
      } else {
        const { error } = await supabase
          .from('scheduled_services')
          .delete()
          .eq('id', agendamento.id);

        if (error) {
          console.error(`  ❌ Erro ao remover agendamento ${agendamento.id}:`, error.message);
        } else {
          console.log(`  ✅ Agendamento ${agendamento.id.slice(0, 8)} removido`);
        }
      }
    }
  }

  /**
   * Corrigir inconsistências de dados
   */
  private async corrigirInconsistencias(): Promise<void> {
    console.log('\n⚠️ Correção de inconsistências não implementada ainda');
    console.log('   Execute manualmente se necessário');
  }
}

// Executar script
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('🔍 Executando em modo DRY RUN (apenas análise)');
    console.log('   Use --execute para aplicar as correções');
  }

  const sincronizador = new TabelaSincronizador(dryRun);

  try {
    await sincronizador.analisar();
    
    if (!dryRun) {
      await sincronizador.sincronizar();
    }
  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}
