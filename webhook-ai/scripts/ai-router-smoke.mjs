import fetch from 'node-fetch';
const more = [
  {name:'lavadora: vazamento', body:'Minha lavadora esta vazando agua'},
  {name:'lava e seca: nao seca', body:'Minha lava e seca nao seca direito, roupa sai umida'},
  {name:'micro ambiguo', body:'Meu micro ondas nao aquece direito'},
  {name:'coifa: luz nao acende', body:'A luz da coifa nao acende'},
  {name:'multi-equip', body:'Meu fogao chama amarela e a lavadora nao centrifuga'},
  {name:'pos atendimento/garantia', body:'O servico de voces deu problema depois, acho que esta na garantia'},
  {name:'instalacao', body:'Preciso instalar um forno eletrico de embutir'},
  {name:'reagendar', body:'Quero reagendar para amanha 10h'},
  {name:'eletroportatil: air fryer', body:'Vocês consertam air fryer?'},
  {name:'eletroportatil: cafeteira', body:'Minha cafeteira Nespresso quebrou, vocês arrumam?'},
];



const base = process.env.WEBHOOK_BASE || 'http://localhost:3100';

const cases = [
  {name:'lava-loucas: nao entra agua', body:'Oi, minha lava-loucas nao entra agua'},
  {name:'lavadora: nao centrifuga', body:'Minha lavadora nao centrifuga Electrolux'},
  {name:'micro ondas: bancada nao aquece', body:'Meu micro-ondas de bancada nao aquece'},
  {name:'micro ondas: embutido', body:'Tenho um micro-ondas embutido que nao liga'},
  {name:'coifa: barulho', body:'Coifa fazendo barulho alto e puxando pouco'},
  {name:'secadora: nao seca', body:'Minha secadora nao seca direito'},
  {name:'fogao: chama amarela', body:'Fogao com chama amarela e cheiro de gas'},
  {name:'forno embutido: nao aquece', body:'Forno eletrico embutido nao aquece direito'},
  {name:'saudacao', body:'Ola, bom dia!'},
  {name:'status', body:'Quero saber o status da minha ordem'},
  {name:'cancelamento', body:'Quero cancelar o atendimento'},
  {name:'reagendamento', body:'Preciso reagendar o horario'},
  {name:'pos atendimento', body:'O servico que voces fizeram deu problema'},
];

async function run(){
  const results = [];
  for (const c of [...cases, ...more]){
    try{
      const res = await fetch(`${base}/test-message`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({from:'5599999999999', body:c.body}) });
      const json = await res.json();
      const r = json && json.reply;
      let replyStr = '';
      if (typeof r === 'string') replyStr = r;
      else if (r && typeof r.text === 'string') replyStr = r.text;
      else replyStr = JSON.stringify(r ?? '');
      results.push({ name:c.name, ok:res.ok, reply: replyStr.slice(0, 180) });
    }catch(e){ results.push({ name:c.name, ok:false, error:String(e)}); }
  }
  console.table(results);
}

run().catch(console.error);

