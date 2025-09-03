import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_KEY; // Usando anon key como o frontend

if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or VITE_SUPABASE_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

console.log('🔍 Simulando exatamente o que o frontend faz...\n');

(async () => {
  // Simula exatamente a query do getAllServiceOrders.ts
  console.log('📡 Fazendo query igual ao frontend...');
  
  const { data, error } = await supabase
    .from('service_orders')
    .select(`
      *,
      client:client_id (
        id,
        name,
        email,
        phone,
        cpf_cnpj,
        address_complement,
        address_reference,
        city,
        state,
        zip_code
      ),
      service_order_images (*),
      service_items (*)
    `)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro na query (igual ao que o frontend veria):', error);
    process.exit(1);
  }

  console.log(`✅ Query executada com sucesso!`);
  console.log(`📊 Total de ordens retornadas: ${data.length}\n`);

  if (data.length === 0) {
    console.log('⚠️  Nenhuma ordem retornada pela query do frontend!');
    console.log('🔍 Isso explica por que o dashboard está zerado.');
    
    // Vamos verificar se é problema de RLS
    console.log('\n🔐 Verificando se é problema de RLS...');
    const { data: rawData, error: rawError } = await supabase
      .from('service_orders')
      .select('id, client_name, status, archived')
      .eq('archived', false);
    
    if (rawError) {
      console.log('❌ Erro mesmo na query simples:', rawError);
    } else {
      console.log(`📋 Query simples retornou ${rawData.length} ordens`);
      if (rawData.length > 0) {
        console.log('🚨 PROBLEMA: RLS ou permissões estão bloqueando a query complexa!');
      }
    }
    process.exit(0);
  }

  // Simula o mapeamento
  console.log('🔄 Simulando mapeamento das ordens...\n');
  
  const mappedOrders = data.map(order => {
    console.log(`📋 Ordem ${order.id.substring(0, 8)}: ${order.client_name} - Status: ${order.status}`);
    
    return {
      id: order.id,
      clientName: order.client_name,
      status: order.status,
      initialCost: order.initial_cost ? parseFloat(order.initial_cost.toString()) : 0,
      finalCost: order.final_cost ? parseFloat(order.final_cost.toString()) : 0,
      paymentStatus: order.payment_status || null,
      archived: order.archived || false
    };
  });

  console.log('\n🎯 Calculando contagens do Dashboard...');
  
  // Simula exatamente as contagens do Dashboard.tsx
  const pendingOrders = mappedOrders.filter(o =>
    o.status === 'pending' || o.status === 'scheduled' || o.status === 'scheduled_collection'
  ).length;
  
  const inProgressOrders = mappedOrders.filter(order =>
    order.status === 'in_progress' || order.status === 'collected' ||
    order.status === 'collected_for_diagnosis' || order.status === 'at_workshop' ||
    order.status === 'received_at_workshop' || order.status === 'diagnosis_completed' ||
    order.status === 'awaiting_quote_approval' || order.status === 'quote_approved' ||
    order.status === 'ready_for_delivery' || order.status === 'delivery_scheduled' ||
    order.status === 'collected_for_delivery' || order.status === 'on_the_way_to_deliver' ||
    order.status === 'payment_pending'
  ).length;
  
  const completedOrders = mappedOrders.filter(order => order.status === 'completed').length;
  
  console.log(`📊 Resultados que o Dashboard deveria mostrar:`);
  console.log(`   Pendentes: ${pendingOrders}`);
  console.log(`   Em Andamento: ${inProgressOrders}`);
  console.log(`   Concluídas: ${completedOrders}`);
  
  // Cálculo de receita
  let totalReceived = 0;
  let totalPending = 0;
  
  mappedOrders.forEach(order => {
    const { initialCost, finalCost, paymentStatus } = order;
    
    if (paymentStatus === 'completed') {
      totalReceived += finalCost;
    } else if (paymentStatus === 'partial' || paymentStatus === 'advance_paid') {
      totalReceived += initialCost;
      if (finalCost > initialCost) {
        totalPending += (finalCost - initialCost);
      }
    } else if (initialCost > 0) {
      totalReceived += initialCost;
      if (finalCost > initialCost) {
        totalPending += (finalCost - initialCost);
      }
    } else if (finalCost > 0) {
      totalPending += finalCost;
    }
  });
  
  console.log(`💰 Receitas:`);
  console.log(`   Total Recebido: R$ ${totalReceived.toFixed(2)}`);
  console.log(`   Total Pendente: R$ ${totalPending.toFixed(2)}`);
  
  if (pendingOrders === 0 && inProgressOrders === 0 && completedOrders === 0) {
    console.log('\n🚨 PROBLEMA IDENTIFICADO: Todas as contagens são 0!');
    console.log('🔍 Isso indica que o problema está no mapeamento ou na lógica de filtros.');
  } else {
    console.log('\n✅ Os dados estão corretos. O problema deve estar no frontend.');
    console.log('🔍 Verifique o console do navegador para erros JavaScript.');
  }

  process.exit(0);
})();
