import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_*_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log('🔍 Verificando logs do bot webhook...\n');

(async () => {
  try {
    // 1. Logs do AI Router
    console.log('📊 1. Logs do AI Router (últimas 10 entradas):');
    console.log('─'.repeat(100));
    
    const { data: aiLogs, error: aiError } = await supabase
      .from('bot_ai_router_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (aiError) {
      console.log('❌ Erro ao buscar logs AI Router:', aiError.message);
    } else if (aiLogs && aiLogs.length > 0) {
      aiLogs.forEach((log, idx) => {
        const time = new Date(log.created_at).toLocaleString('pt-BR');
        console.log(`${idx + 1}. [${time}] ${log.event}`);
        if (log.payload) {
          const payload = typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload, null, 2);
          console.log(`   Payload: ${payload.slice(0, 200)}${payload.length > 200 ? '...' : ''}`);
        }
        console.log('');
      });
    } else {
      console.log('   Nenhum log encontrado');
    }

    // 2. Mensagens do bot (últimas 20)
    console.log('\n💬 2. Mensagens do bot (últimas 20):');
    console.log('─'.repeat(100));
    
    const { data: messages, error: msgError } = await supabase
      .from('bot_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (msgError) {
      console.log('❌ Erro ao buscar mensagens:', msgError.message);
    } else if (messages && messages.length > 0) {
      messages.forEach((msg, idx) => {
        const time = new Date(msg.created_at).toLocaleString('pt-BR');
        const direction = msg.direction === 'in' ? '📥' : '📤';
        const body = msg.body ? msg.body.slice(0, 100) : '(vazio)';
        console.log(`${idx + 1}. ${direction} [${time}] ${body}${msg.body && msg.body.length > 100 ? '...' : ''}`);
        if (msg.meta) {
          console.log(`   Meta: ${JSON.stringify(msg.meta)}`);
        }
      });
    } else {
      console.log('   Nenhuma mensagem encontrada');
    }

    // 3. Sessões ativas
    console.log('\n🔗 3. Sessões do bot (últimas 10):');
    console.log('─'.repeat(100));
    
    const { data: sessions, error: sessError } = await supabase
      .from('bot_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sessError) {
      console.log('❌ Erro ao buscar sessões:', sessError.message);
    } else if (sessions && sessions.length > 0) {
      sessions.forEach((session, idx) => {
        const time = new Date(session.created_at).toLocaleString('pt-BR');
        const lastActivity = session.state?.last_in_at ? 
          new Date(session.state.last_in_at).toLocaleString('pt-BR') : 'N/A';
        console.log(`${idx + 1}. [${time}] ${session.channel}:${session.contact_id}`);
        console.log(`   Última atividade: ${lastActivity}`);
        if (session.state?.last_raw_message) {
          console.log(`   Última mensagem: ${session.state.last_raw_message.slice(0, 80)}`);
        }
        console.log('');
      });
    } else {
      console.log('   Nenhuma sessão encontrada');
    }

    // 4. Buscar mensagens específicas com a resposta problemática
    console.log('\n🎯 4. Buscando mensagens com "Visita técnica padrão":');
    console.log('─'.repeat(100));
    
    const { data: specificMsgs, error: specError } = await supabase
      .from('bot_messages')
      .select('*')
      .ilike('body', '%Visita técnica padrão%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (specError) {
      console.log('❌ Erro ao buscar mensagens específicas:', specError.message);
    } else if (specificMsgs && specificMsgs.length > 0) {
      specificMsgs.forEach((msg, idx) => {
        const time = new Date(msg.created_at).toLocaleString('pt-BR');
        const direction = msg.direction === 'in' ? '📥 ENTRADA' : '📤 SAÍDA';
        console.log(`${idx + 1}. ${direction} [${time}]`);
        console.log(`   Sessão: ${msg.session_id}`);
        console.log(`   Mensagem: ${msg.body}`);
        if (msg.meta) {
          console.log(`   Meta: ${JSON.stringify(msg.meta, null, 2)}`);
        }
        console.log('');
      });
    } else {
      console.log('   Nenhuma mensagem encontrada com esse texto');
    }

    // 5. Logs de decisão (se existir a tabela)
    console.log('\n📋 5. Logs de decisão (se disponível):');
    console.log('─'.repeat(100));
    
    try {
      const { data: decisions, error: decError } = await supabase
        .from('decision_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (decError) {
        console.log('   Tabela decision_logs não encontrada ou erro:', decError.message);
      } else if (decisions && decisions.length > 0) {
        decisions.forEach((dec, idx) => {
          const time = new Date(dec.created_at).toLocaleString('pt-BR');
          console.log(`${idx + 1}. [${time}] ${dec.entity}:${dec.entity_id} - ${dec.action}`);
          if (dec.details) {
            const details = typeof dec.details === 'string' ? dec.details : JSON.stringify(dec.details);
            console.log(`   Detalhes: ${details.slice(0, 150)}${details.length > 150 ? '...' : ''}`);
          }
        });
      } else {
        console.log('   Nenhum log de decisão encontrado');
      }
    } catch (e) {
      console.log('   Tabela decision_logs não existe');
    }

    console.log('\n✅ Análise de logs concluída!');
    console.log('\n💡 Para investigar mais:');
    console.log('   - Verifique os logs do AI Router para ver as decisões da IA');
    console.log('   - Analise as mensagens de entrada/saída para entender o fluxo');
    console.log('   - Procure por padrões nas sessões ativas');

  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
  
  process.exit(0);
})();
