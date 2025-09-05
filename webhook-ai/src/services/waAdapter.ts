import { waClient } from './waClient.js';
import { processFAQ } from './modules/faq.js';
import { processGarantia } from './modules/garantia.js';
import { processStatus } from './modules/status.js';
import { processFeedback } from './modules/feedback.js';
import { tryHandleByFlows } from './flowEngine.js';
import { orchestrateInbound } from './conversationOrchestrator.js';
import { getOrCreateSession, logMessage } from './sessionStore.js';

function looksLikeConfirmation(text: string) {
  const t = text.toLowerCase();
  return t.includes('confirmo') || t.includes('confirmar agendamento');
}
// Anti-duplicação simples: evita processar a mesma mensagem duas vezes em poucos segundos
const __recentMessages = new Map<string, number>(); // key = from::text, value = timestamp ms

let __inboundSetupDone = false;


export async function setupWAInboundAdapter() {
  if (__inboundSetupDone) {
    console.log('[Adapter] 🔧 Setup já foi feito, pulando...');
    return; // evitar listeners duplicados em hot reload
  }
  console.log('[Adapter] 🔧 Iniciando setup do adapter...');
  __inboundSetupDone = true;
  const asWebhookBody = (from: string, text: string) => ({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { from, type: 'text', text: { body: text } }
              ]
            }
          }
        ]
      }
    ]
  });

  const { isGloballyPaused } = await import('./pause.js');
  // Listener para mensagens with mídia (classificação visual)

  waClient.onAnyMessage(async (msg:any, meta?: { id?: string; ts?: number; type?: string }) => {
    try {
      if (!msg || !msg.hasMedia) return;
      let media = null as any;
      try {
        media = await msg.downloadMedia?.();
      } catch (err) {
        console.warn('[Adapter] Falha no downloadMedia(), tentando novamente em 500ms...', err);
        await new Promise(r=>setTimeout(r, 500));
        try { media = await msg.downloadMedia?.(); } catch {}
      }

	      // Guard de ID único por mensagem (mídia): evita reprocessar mesma mídia em reconexões
	      try {
	        const metaId = meta?.id as string | undefined;
	        if (metaId) {
	          const keyId = `id::${metaId}`;
	          const lastId = __recentMessages.get(keyId) || 0;
	          const nowId = Date.now();
	          if (nowId - lastId < 60 * 1000) {
	            console.warn('[Adapter] (media) Ignorando duplicata por ID:', metaId);
	            return;
	          }
	          __recentMessages.set(keyId, nowId);
	        }
	      } catch {}

      if (!media || !media.mimetype?.startsWith('image/')) return;

      // Ignorar imagens de status@broadcast (stories do WhatsApp)
      if (msg.from === 'status@broadcast') {
        console.log('[Adapter] Ignorando imagem de status@broadcast');
        return;
      }

      // Ignorar imagens do próprio bot (evitar auto-loop)
      if (msg.from.includes('554888332664')) {
        console.log('[Adapter] Ignorando imagem do próprio bot:', msg.from);
        return;
      }

      console.log('[Adapter] Imagem recebida de', msg.from, '→ classificando...');

      const { getOrCreateSession, setSessionState } = await import('./sessionStore.js');
      const session = await getOrCreateSession('whatsapp', msg.from);

      let classificationResult = null;

      // Tentativa 1: API local de classificação
      try {
        const base = process.env.API_URL || 'http://localhost:3001';
        const headers:any = { 'Content-Type':'application/json' };
        if (process.env.BOT_TOKEN) headers['x-bot-token'] = process.env.BOT_TOKEN;
        const resp = await fetch(`${base}/api/vision/classify-stove`, {
          method:'POST',
          headers,
          body: JSON.stringify({ imageBase64: `data:${media.mimetype};base64,${media.data}` })
        });
        const data = await resp.json().catch(()=>null);
        if (resp.ok && data?.ok && ((data?.type && data.type !== 'indeterminado') || (data?.segment && data.segment !== 'indeterminado'))) {
          classificationResult = {
            segment: data.segment,
            type: data.type,
            confidence: data.confidence,
            source: 'api'
          };
          console.log('[Adapter] Classificação via API:', classificationResult);
        } else {
          console.log('[Adapter] API retornou resultado indeterminado ou inválido, tentando GPT-4o Vision...');
        }
      } catch (apiError) {
        console.log('[Adapter] API indisponível, tentando GPT-4o Vision...');
      }

      // Tentativa 2: GPT-4o Vision como fallback
      if (!classificationResult) {
        try {
          const { chatComplete } = await import('./llmClient.js');
          const imageData = `data:${media.mimetype};base64,${media.data}`;

          const visionResponse = await chatComplete({
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.1,
            maxTokens: 300
          }, [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analise esta imagem de fogão e responda APENAS com um JSON no formato: {"type": "floor|cooktop|indeterminado", "segment": "basico|inox|premium|indeterminado", "burners": "4|5|6|indeterminado"}. Critérios: type=floor se for fogão de piso, cooktop se for cooktop/embutido. segment=basico se for simples/branco, inox se for inox, premium se for vidro/moderno. burners=número de bocas visíveis.'
                },
                {
                  type: 'image_url',
                  image_url: { url: imageData }
                }
              ]
            }
          ]);

          // Alguns modelos retornam bloco de código (```json ... ```). Sanitizar antes do parse.
          const cleaned = String(visionResponse || '')
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          const visionData = JSON.parse(cleaned || '{}');
          classificationResult = {
            segment: visionData.segment || 'indeterminado',
            type: visionData.type || 'indeterminado',
            burners: visionData.burners || 'indeterminado',
            confidence: 0.8,
            source: 'gpt4o-vision'
          };
          console.log('[Adapter] Classificação via GPT-4o Vision:', classificationResult);
        } catch (visionError) {
          console.error('[Adapter] Erro na classificação por visão:', visionError);
        }
      }

      // Salvar resultado na sessão
      if (classificationResult) {
        const st = session.state || {};
        st.visual_segment = classificationResult.segment;
        st.visual_type = classificationResult.type;
        st.visual_burners = classificationResult.burners;
        st.visual_confidence = classificationResult.confidence;
        st.visual_source = classificationResult.source;
        await setSessionState(session.id, st);
        console.log('[Adapter] Classificação salva na sessão:', st);
      }
    } catch (e) {
      console.error('[Adapter] Erro ao processar imagem', e);
    }
  });

  waClient.onMessage(async (from, body, meta?: { id?: string; ts?: number; type?: string }) => {
    const text = (body || '').trim();
    console.log('[Adapter] Mensagem recebida de', from, 'texto:', text);

    // Ignorar mensagens de status@broadcast (stories do WhatsApp)
    if (from === 'status@broadcast') {
      console.log('[Adapter] Ignorando mensagem de status@broadcast');
      return;
    }

    // Ignorar mensagens do próprio bot (evitar auto-loop)
    if (from.includes('554888332664')) {
      console.log('[Adapter] Ignorando mensagem do próprio bot:', from);
      return;
    }

    // Comandos rápidos de pausa por conversa
    if (text === "'") { // pausa
      const session = await getOrCreateSession('whatsapp', from);
      const st = { ...(session.state || {}), paused: true };
      await (await import('./sessionStore.js')).setSessionState(session.id, st);
      await waClient.sendText(from, 'Bot pausado para esta conversa. Envie = para reativar.');
      return;
    }
    if (text === "=") { // despausa
      const session = await getOrCreateSession('whatsapp', from);
      const st = { ...(session.state || {}), paused: false };
      await (await import('./sessionStore.js')).setSessionState(session.id, st);
      await waClient.sendText(from, 'Bot reativado para esta conversa.');
      return;
    }

    // Silêncio total quando a última config não estiver publicada
    const { supabase } = await import('./supabase.js');
    const { data: last } = await supabase
      .from('bot_configs')
      .select('status')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Guard por ID específico do WhatsApp (texto): evita reprocessar a mesma mensagem por reconexões
    try {
      const metaId = (arguments as any)?.[2]?.id as string | undefined;
      if (metaId) {
        const keyId = `id::${metaId}`;
        const lastId = __recentMessages.get(keyId) || 0;
        const nowId = Date.now();
        if (nowId - lastId < 60 * 1000) return;
        __recentMessages.set(keyId, nowId);
      }
    } catch {}

    // TEMPORÁRIO: Comentado para teste
    // if (!last || last.status !== 'published') {
    //   console.log('[Adapter] Bot desligado (status != published). Ignorando mensagem.');
    //   return;
    // }
    console.log('[Adapter] Status do bot:', last?.status || 'não encontrado', '- Processando mensagem...');


	    // Anti-duplicação logo no início do processamento textual
	    try {
	      const nowTs = Date.now();
	      const key = `${from}::${text}`;
	      const last = __recentMessages.get(key) || 0;
	      if (nowTs - last < 10000) { // Aumentado para 10 segundos
	        console.warn('[Adapter] (text) Ignorando duplicata recente de', from, 'texto:', text);
	        return;
	      }
	      __recentMessages.set(key, nowTs);
	      // Limpeza simples
	      if (__recentMessages.size > 5000) {
	        for (const [k, v] of __recentMessages) {
	          if (nowTs - v > 5 * 60 * 1000) __recentMessages.delete(k);
	        }
	      }
	    } catch {}

    // Carregar/abrir sessão e registrar inbound
    const session = await getOrCreateSession('whatsapp', from);
    await logMessage(session.id, 'in', text);

    // Atualizar timestamp de última entrada
    try {
      const nowIso = new Date().toISOString();
      const st0 = { ...(session?.state || {}), last_in_at: nowIso, last_raw_message: text } as any;
      await (await import('./sessionStore.js')).setSessionState(session.id, st0);
    } catch {}

    // Re-greeting humanizado se for retorno após ausência
    try {
      const norm = text.normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
      const isGreetingOnly = /^(ola|oi|bom dia|boa tarde|boa noite|opa|e ai|tudo bem)[.!? ]*$/.test(norm);
      const st = (session?.state || {}) as any;
      const lastIn = st.last_in_at ? new Date(st.last_in_at) : null;
      const lastOut = st.last_out_at ? new Date(st.last_out_at) : null;
      const lastTs = lastIn || lastOut;
      const now = new Date();
      const gapMin = lastTs ? Math.floor((now.getTime() - lastTs.getTime())/60000) : null;
      const cooldownOk = !st.reengaged_at || (now.getTime() - new Date(st.reengaged_at).getTime()) > 2*60*1000;

      if (isGreetingOnly && gapMin !== null && gapMin > 60 && cooldownOk) {
        const hasContext = !!(st?.dados_coletados && (st.dados_coletados.equipamento || st.dados_coletados.problema));
        let msg = '';
        if (gapMin >= 24*60) {
          msg = hasContext
            ? `Olá de novo! Da última vez falamos sobre seu ${st.dados_coletados.equipamento || ''}${st.dados_coletados.problema? ' ('+st.dados_coletados.problema+')':''}. Quer continuar de onde paramos ou começar um novo atendimento?`
            : 'Olá de novo! Quer retomar de onde paramos ou começar um novo atendimento?';
        } else {
          msg = hasContext
            ? `Que bom te ver por aqui de novo. Retomamos do seu ${st.dados_coletados.equipamento || 'atendimento anterior'}${st.dados_coletados.problema? ' ('+st.dados_coletados.problema+')':''}?`
            : 'Que bom te ver por aqui de novo. Quer continuar de onde paramos?';
        }
        await waClient.sendText(from, msg);
        await logMessage(session.id, 'out', msg);
        await (await import('./sessionStore.js')).setSessionState(session.id, { ...(st||{}), reengaged_at: now.toISOString(), last_out_at: now.toISOString() });
        return;
      }
    } catch {}


    // Já carregamos a sessão e registramos o inbound acima
    // Enviar saudação curta uma única vez por conversa (mais natural)
    try {
      const greeted = !!(session?.state?.greeted);
      if (!greeted) {
        // Se houver template 'greeting' configurado, use-o; caso contrário, use fallback curto
        let greetingText = 'Olá, farei seu atendimento. Como posso ajudar?';
        try {
          const { getTemplates, renderTemplate } = await import('./botConfig.js');
          const templates = await getTemplates();
          const greeting = templates.find((t: any) => t.key === 'greeting');
          if (greeting?.content) greetingText = renderTemplate(greeting.content, {});
        } catch {}
        await waClient.sendText(from, greetingText);
        await logMessage(session.id, 'out', greetingText);
        const { setSessionState } = await import('./sessionStore.js');
        await setSessionState(session.id, { ...(session.state || {}), greeted: true, last_out_at: new Date().toISOString() });
        // Se a mensagem do cliente for apenas uma saudação, não prossiga para evitar duas mensagens em sequência
        const norm = text.normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
        const isJustGreeting = /^(ola|oi|bom dia|boa tarde|boa noite)[.!? ]*$/.test(norm);
        if (isJustGreeting) return;
      }
    } catch {}


    // Test mode: só processa mensagens do número whitelisted
    try {
      const { isTestModeEnabled, isPeerAllowedForTestMode } = await import('./testMode.js');
      if (isTestModeEnabled() && !isPeerAllowedForTestMode(from)) {
        console.log('[Adapter] Test mode ativo. Ignorando mensagem de', from);
        return;
      }
    } catch {}

    // Pausa global
    if (isGloballyPaused()) {
      console.log('[Adapter] Bot pausado globalmente. Ignorando mensagem.');
      return;
    }
    // Pausa por conversa
    if (session?.state?.paused) {
      console.log('[Adapter] Bot pausado nesta conversa. Ignorando mensagem.');
      return;
    }

    const llmFirst = (process.env.LLM_FIRST ?? 'true').toLowerCase() !== 'false';

    if (llmFirst) {
      // LLM primeiro para respostas mais naturais
      console.log('[Adapter] Tentando LLM primeiro para', from);
      try {
        // Expor estado corrente para sanitizer evitar inventar marca em respostas naturais
        try { (global as any).current_session_state_for_sanitizer = (session as any)?.state || null; } catch {}
        let reply = await orchestrateInbound(from, text, session);

        // Se o orquestrador decidir não repetir (cooldown) e já temos dados, force orçamento
        if (!reply) {
          const st = (session as any)?.state || {};
          const hasMount = !!st.visual_type;
          const hasBurners = !!st.visual_burners;
          if (hasMount && hasBurners) {
            const { buildQuote } = await import('./toolsRuntime.js');
            const mount = st.visual_type === 'floor' ? 'piso' : 'cooktop';
            const quote = await buildQuote({ service_type: 'domicilio', equipment: 'fogão', power_type: 'gás', mount, num_burners: st.visual_burners } as any);
            if (quote) {
              reply = `Orçamento estimado: R$ ${quote?.value ?? quote?.min ?? '—'} (faixa R$ ${quote?.min ?? '—'} a R$ ${quote?.max ?? '—'}). Podemos prosseguir com o agendamento?`;
            }
          }
        }

        // Se a resposta do orquestrador vier no formato { text, options }, enviar botões
        try {
          if (reply && typeof reply === 'object' && (reply as any).text && Array.isArray((reply as any).options)) {
            const r: any = reply;
            const options = (r.options as Array<{ id?: string, text: string }>).map((o, i) => ({ id: o.id || String(i+1), text: o.text }));
            await waClient.sendButtons(from, r.text, options);
            await logMessage(session.id, 'out', r.text + ' [buttons]');
            return;
          }
        } catch {}

        const preview = typeof reply === 'string' ? reply.slice(0, 100) : JSON.stringify(reply).slice(0, 100);
        console.log('[Adapter] LLM respondeu:', preview);
        if (reply) {
          if (typeof reply === 'string') {
            await waClient.sendText(from, reply);
            await logMessage(session.id, 'out', reply);
          } else if ((reply as any).text && Array.isArray((reply as any).options)) {
            const r: any = reply;
            const options = (r.options as Array<{ id?: string, text: string }>).map((o, i) => ({ id: o.id || String(i+1), text: o.text }));
            await waClient.sendButtons(from, r.text, options);
            await logMessage(session.id, 'out', r.text + ' [buttons]');
          } else {
            const text = JSON.stringify(reply);
            await waClient.sendText(from, text);
            await logMessage(session.id, 'out', text);
          }
          console.log('[Adapter] Resposta enviada via LLM');
          return;
        }
      } catch (e) {
        console.error('[Adapter] orchestrator error', e);
      }
    } else {
      // Flows primeiro (modo legado)
      console.log('[Adapter] Tentando flows primeiro para', from);
      const handled = await tryHandleByFlows(from, text);
      if (handled) return;
    }

    if (looksLikeConfirmation(text)) {
      await waClient.sendText(from, 'Confirmação recebida.');
      return;
    }

    const lowered = text.toLowerCase();
    if (lowered.includes('status')) {
      await processStatus(asWebhookBody(from, text));
      return;
    }
    if (lowered.includes('garantia')) {
      await processGarantia(asWebhookBody(from, text));
      return;
    }
    if (lowered.includes('feedback')) {
      await processFeedback(asWebhookBody(from, text));
      return;
    }

    // Flows/FAQ como fallback (templates/config)
    const handled = await tryHandleByFlows(from, text);
    if (handled) return;

    console.log('[Adapter] FAQ fallback para', from);
    await processFAQ(asWebhookBody(from, text));
  });

  console.log('[Adapter] 🔧 Setup do adapter concluído! Handlers registrados.');
}

