const base = process.env.MW_BASE || 'http://127.0.0.1:8000';
const url1 = base + '/agendamento-inteligente';
const urlList = base + '/api/agendamentos';
const url2 = base + '/agendamento-inteligente-confirmacao';

const telefone = '559991234567';
const body = {
  nome: 'Teste Valor',
  endereco: 'Rua Teste 123, Centro, Florianopolis - SC, 88000-000',
  equipamento: 'geladeira',
  problema: 'nao gela',
  telefone,
  urgente: 'nao',
  cpf: '12345678909',
  email: 'teste+valor@example.com',
  valor_servico: 249.9
};

(async () => {
  // ETAPA 1
  const res1 = await fetch(url1, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text1 = await res1.text();
  console.log('ETAPA1 Status', res1.status);
  console.log(text1.slice(0, 600));

  // Listar e mostrar valores do pre-agendamento
  const resList = await fetch(urlList);
  const list = await resList.json();
  const mine = (list && list.data || []).find(d => d.telefone === telefone);
  console.log('PRE_AG_VALORES', mine && (mine.valor_os_1 || mine.valor_servico || mine.valor_os), mine && mine.valor_os_1, mine && mine.valor_servico, mine && mine.valor_os);

  // ETAPA 2 - confirmar primeira opcao
  const res2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone_contato: telefone, opcao_escolhida: '1' }) });
  const text2 = await res2.text();
  console.log('ETAPA2 Status', res2.status);
  console.log(text2.slice(0, 800));
})();

