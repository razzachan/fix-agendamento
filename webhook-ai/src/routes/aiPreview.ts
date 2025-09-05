import { Router } from 'express';
import { z } from 'zod';
import { chatComplete, buildSystemPrompt } from '../services/llmClient.js';
import { getActiveBot } from '../services/botConfig.js';
import { renderBlocksForPrompt, KnowledgeBlock } from '../services/knowledge.js';
import { makeToolGuide } from '../services/tools.js';

export const aiPreviewRouter = Router();

const Body = z.object({
  message: z.string().default('Gere uma resposta de exemplo com base no bloco.'),
  block: z.object({
    key: z.string(),
    type: z.string().optional(),
    description: z.string().optional(),
    data: z.any().optional(),
  }),
});

aiPreviewRouter.post('/preview', async (req, res) => {
  try {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: 'invalid_body', issues: parsed.error.errors });

    const { message, block } = parsed.data;
    const bot = await getActiveBot();
    const llm = (bot as any)?.llm || {};

    const sys =
      buildSystemPrompt((bot as any)?.personality?.systemPrompt, undefined) +
      '\n\n' +
      renderBlocksForPrompt([block as KnowledgeBlock]) +
      '\n\n' +
      'Instruções: Use o bloco acima como conhecimento para formular uma resposta natural. Não copie textos de mensagens_base literalmente.' +
      '\n\n' +
      makeToolGuide();

    const provider = llm.provider || 'openai';
    const model =
      provider === 'anthropic'
        ? llm.model || process.env.LLM_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
        : llm.model || process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini';

    const text = await chatComplete(
      { provider, model, temperature: llm.temperature ?? 0.7, maxTokens: 600 },
      [
        { role: 'system', content: sys },
        { role: 'user', content: message },
      ]
    );

    return res.json({ ok: true, preview: (text || '').trim() });
  } catch (e: any) {
    return res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});
