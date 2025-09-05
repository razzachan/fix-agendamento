// Centralized copy for field and section hints (PT-BR)
export const Hints = {
  llm: {
    section: {
      title: 'Como escolher o modelo',
      desc: 'Escolha o provedor e um modelo adequados ao seu caso. OpenAI (gpt-4o/mini) tende a ser mais rápido; Anthropic (Claude 3.5) costuma ir melhor em respostas longas e seguras. Ajuste “temperature” para criatividade e “max tokens” para o tamanho das respostas.'
    },
    provider: 'Define o provedor de IA que executará as respostas do bot. Escolha OpenAI ou Anthropic conforme as chaves configuradas.',
    model: 'Modelo do provedor selecionado. Ex.: gpt-4o/mini (OpenAI), Claude 3.5 Sonnet (Anthropic). Equilibre desempenho e custo.',
    temperature: 'Controla a criatividade: valores baixos (0.2–0.5) deixam as respostas mais estáveis; altos (0.8–1.2) tornam o texto mais criativo.',
    maxTokens: 'Limite máximo de tokens na geração (saída). Valores maiores permitem respostas mais longas, porém aumentam custo e latência.'
  },
  personality: {
    section: {
      title: 'Escrevendo um bom System Prompt',
      desc: 'Explique claramente o papel do assistente, limites (o que pode/não pode), tom esperado e exemplos concisos. Evite ambiguidades.'
    },
    systemPrompt: 'Instruções de alto nível que orientam tudo o que o assistente faz. Seja específico e objetivo.'
  },
  context: {
    section: {
      title: 'Blocos de contexto',
      desc: 'Adicione instruções e variáveis válidas apenas quando certas intenções estiverem ativas. Isso foca o modelo no tema certo sem poluir o prompt global.'
    },
    key: 'Identificador do bloco (ex.: orcamento, agenda). Usado para referência interna.',
    intents: 'Quais intenções ativam este bloco (ex.: orcamento, agendamento).',
    description: 'Explique o objetivo do bloco e como deve orientar as respostas.',
    variables: 'Valores auxiliares (ex.: limites, flags) para uso do modelo nas respostas desta intenção.'
  },
  intents: {
    section: {
      title: 'Como definir intenções',
      desc: 'Escreva frases reais de usuários (uma por linha), como “quero orçamento”, “ver horários”, “cancelar agendamento”. Evite frases muito parecidas entre intenções.'
    },
    examples: 'Frases típicas do usuário que expressem a intenção. Uma por linha.',
    tool: 'Nome da ferramenta chamada quando a intenção é detectada (ex.: buildQuote, getAvailability).',
    schema: 'Estrutura (JSON) dos parâmetros esperados pela ferramenta. Ajuda o modelo a preencher corretamente.'
  },
  templates: {
    section: {
      title: 'Como usar templates',
      desc: 'Crie mensagens reutilizáveis por chave (ex.: greeting). Você pode inserir variáveis com {{ nome }}. Use templates para respostas fixas que não dependem de geração do modelo.'
    },
    key: 'Identificador do template (ex.: greeting, thanks, fallback).',
    channel: 'Canal onde o template é usado (ex.: whatsapp).',
    language: 'Idioma do texto (ex.: pt-BR). Pode haver variações por idioma.',
    content: 'Texto do template. Suporta variáveis com {{ nome }}.'
  },
  schedule: {
    section: {
      title: 'Como a disponibilidade é calculada',
      desc: 'Os horários exibidos consideram: janelas de funcionamento, bloqueios e reservas já existentes. A reserva aqui é um teste local.'
    }
  },
  workingHours: {
    section: {
      title: 'Janelas de atendimento',
      desc: 'Defina horários de início e fim por dia da semana. A agenda e os orçamentos só oferecerão horários dentro dessas janelas.'
    }
  },
  blackouts: {
    section: {
      title: 'Quando usar bloqueios',
      desc: 'Crie janelas de indisponibilidade para feriados, manutenção ou treinamentos. Esses períodos não aparecem na agenda.'
    }
  },
  flows: {
    section: {
      title: 'Como funcionam os fluxos',
      desc: 'Fluxos disparam ações com base em gatilhos (ex.: palavras‑chave). Este MVP envia templates. Em breve: condições, múltiplas ações e tool‑calls.'
    },
    keyword: 'Quando esta palavra for recebida, o fluxo será disparado. Evite conflito com intenções.'
  },
  integrations: {
    section: {
      title: 'Como funcionam os Canais',
      desc: 'WhatsApp via Web (QR) funciona localmente com o Webhook AI (porta 3100). Você pode conectar depois. Diferente da Cloud API e sem credenciais Meta.'
    }
  },
  analytics: {
    section: {
      title: 'Como ler estes dados',
      desc: 'Consolida threads de conversa e mensagens do Supabase. Use filtros para investigar períodos e contatos. Em breve: KPIs e funil.'
    }
  },
  overview: {
    publish: {
      title: 'Publicação',
      desc: 'Publicar congela a configuração atual para produção. Você pode seguir editando em rascunho e publicar de novo quando estiver pronto.'
    }
  }
} as const;

