import express from 'express';
import { processInbound } from '../services/orchestrator';

export const botRouter = express.Router();

botRouter.post('/inbound', async (req, res) => {
  try {
    // TODO: validar X-Bot-Secret
    const { channel, from, body } = req.body || {};
    if (!channel || !from || !body) return res.status(400).json({ error: 'invalid payload' });

    // Lê config do bot (stub — trocar por fetch do banco/config service)
    const llmCfg = req.app.get('botLLM') as any; // { provider, model, temperature, maxTokens }
    const contextBlocks = req.app.get('botContextBlocks') as any[] | undefined;

    const ctx = await processInbound({ channel, from, body }, llmCfg, contextBlocks);
    return res.json(ctx);
  } catch (e:any) {
    console.error('bot inbound error', e);
    return res.status(500).json({ error: 'internal_error', message: e?.message });
  }
});

