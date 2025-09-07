import { describe, it, expect, afterEach } from 'vitest';
import { orchestrateInbound } from '../src/services/conversationOrchestrator.js';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';

// Este teste simula um fluxo completo, natural, com variações de linguagem,
// valida a passagem pelo orçamento, coleta dos dados mínimos e agendamento (ETAPA 1 e 2).

async function run(message: string, state: any = {}, from = 'whatsapp:+5511999999999') {
  // Persistir/recuperar a sessão real para manter estado entre mensagens no E2E
  const peer = from.replace('whatsapp:', '');
  const sess = await getOrCreateSession('whatsapp', peer);
  // Se um estado inicial foi passado, mesclar
  if (state && Object.keys(state).length > 0) {
    await setSessionState(sess.id, state);
  }
  const session = { id: sess.id, channel: 'whatsapp', peer, state: sess.state || {} } as any;
  const out = await orchestrateInbound(from, message, session);
  const text = typeof out === 'string' ? out : (out as any).text || '';
  return { text: text.toLowerCase(), session };
}

describe('E2E: conversa natural até o agendamento', () => {
  const originalFake = process.env.LLM_FAKE_JSON;
  afterEach(() => {
    process.env.LLM_FAKE_JSON = originalFake || '';
  });

  it('Fluxo completo: fogão a gás → orçamento → aceitar → coleta dados → horários → confirmar', async () => {
    const FROM1 = 'whatsapp:+5511999999001';
    // 1) Usuário começa natural e vago
    let r = await run('oi, tudo bem? meu forno não esquenta', {}, FROM1);
    // Orquestrador deve pedir esclarecimento (forno do fogão x elétrico)
    expect(r.text).toMatch(/forno do fogão|fogão a gás|é o forno do fogão|é um fogão a gás, de indução ou elétrico/i);

    // 2) Esclarece tipo → fogão a gás
    r = await run('é fogão a gás', {}, FROM1);

    // 3) Gerar orçamento com dados
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: {
        equipamento: 'fogão a gás',
        marca: 'Brastemp',
        problema: 'não esquenta',
      },
    });
    r = await run('é brastemp e não esquenta', {}, FROM1);
    expect(r.text).toMatch(/valor d[ae] manutenção fica em r\$\s*\d/i);

    // 4) Usuário aceita e pede pra agendar
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'fogão a gás' },
      resposta_sugerida: 'vamos agendar',
    });
    r = await run('aceito o orçamento, pode agendar pra mim?', {}, FROM1);
    // O orquestrador pode pedir dados pessoais se necessário; vamos simular fornecimento natural

    // 4) Usuário fornece dados em mensagens separadas
    r = await run('meu nome é João da Silva', { dados_coletados: { equipamento: 'fogão a gás' } }, FROM1);
    // Pode responder pedindo endereço; fornecemos
    r = await run('meu endereço: Rua Exemplo, 123 - Centro, CEP 01234-000', {}, FROM1);
    // Também fornece e-mail, telefone e CPF
    r = await run('meu e-mail é joao@example.com', {}, FROM1);
    r = await run('meu telefone é (11) 99999-9999', {}, FROM1);
    r = await run('meu cpf é 123.456.789-09', {}, FROM1);

    // 5) Agora pede horários (aiScheduleStart stub de teste)
    process.env.NODE_ENV = 'test';
    r = await run('pode agendar amanhã?', {}, FROM1);
    expect(r.text).toMatch(/opções de horário|09:00|10:30|14:00/);

    // 6) Cliente escolhe opção
    r = await run('2', {}, FROM1);
    expect(r.text).toMatch(/agendamento confirmado/);
  });

  it('Fluxo completo para micro-ondas de bancada → coleta + conserto', async () => {
    const FROM2 = 'whatsapp:+5511999999002';
    // 1) Usuário menciona micro vaga
    let r = await run('meu micro não está esquentando direito', {}, FROM2);
    // Orquestrador deve perguntar embutido x bancada
    // Pode já vir com política quando o modelo reconhece padrão de bancada; aceitamos ambos
    expect(r.text).toMatch(/(embutido|bancada|é embutido ou de bancada|coleta \+ conserto|coletamos, diagnosticamos)/i);

    // 2) Esclarece bancada e gera orçamento
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'orcamento_equipamento',
      acao_principal: 'gerar_orcamento',
      dados_extrair: {
        equipamento: 'micro-ondas',
        marca: 'LG',
        problema: 'não esquenta',
        mount: 'bancada',
      },
    });
    r = await run('é de bancada, lg, não esquenta', {}, FROM2);
    expect(r.text).toMatch(/coleta \+ conserto|o valor de manutenção fica em r\$\s*\d+/i);

    // 3) Aceita e pede para agendar
    process.env.LLM_FAKE_JSON = JSON.stringify({
      intent: 'agendamento_servico',
      acao_principal: 'agendar_servico',
      dados_extrair: { equipamento: 'micro-ondas' },
      resposta_sugerida: 'vamos agendar',
    });
    r = await run('ok, pode agendar', {}, FROM2);

    // 4) Dados pessoais
    r = await run('meu nome é Maria', {}, FROM2);
    r = await run('endereço: Avenida Teste, 987 - Bairro, 04567-000', {}, FROM2);
    r = await run('e-mail: maria@example.com', {}, FROM2);
    r = await run('telefone: 11 98888-7777', {}, FROM2);
    r = await run('cpf: 987.654.321-00', {}, FROM2);

    // 5) Horários
    process.env.NODE_ENV = 'test';
    r = await run('quero amanhã de manhã', {}, FROM2);
    expect(r.text).toMatch(/opções de horário|09:00|10:30|14:00/);

    // 6) Confirmar
    r = await run('1', {}, FROM2);
    expect(r.text).toMatch(/agendamento confirmado/);
  });
});

