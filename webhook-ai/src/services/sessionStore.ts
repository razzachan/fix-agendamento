import { supabase } from './supabase.js';
import { getPeerIdVariants, normalizePeerId } from './peerId.js';
import { mergeStateWithStage } from './orchestrator/stageMachine.js';
import { logger } from './logger.js';

export type SessionRecord = {
  id: string;
  channel: string;
  peer_id: string;
  state?: any;
  state_version?: number;
};

class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

function looksLikeMissingColumnError(error: any, columnName: string): boolean {
  const msg = String(error?.message || error || '');
  const lower = msg.toLowerCase();
  return lower.includes('column') && lower.includes('does not exist') && lower.includes(columnName.toLowerCase());
}

export async function getOrCreateSession(channel: string, peer_id: string): Promise<SessionRecord> {
  logger.debug('[SESSION] getOrCreateSession called with:', { channel, peer_id });

  try {
    // try find existing
    try {
      logger.debug('[SESSION] Searching for existing session...');
      const canonicalPeer = normalizePeerId(channel, peer_id);
      const variants = getPeerIdVariants(channel, peer_id);
      for (const p of variants) {
        const { data: existing } = await supabase
          .from('bot_sessions')
          .select('*')
          .eq('channel', channel)
          .eq('peer_id', p)
          .limit(1)
          .single();
        if (existing) {
          logger.debug('[SESSION] Found existing session:', { id: existing?.id });
          // Migrate legacy peer_id to canonical (best-effort)
          try {
            if (canonicalPeer && String((existing as any).peer_id) !== canonicalPeer) {
              await supabase
                .from('bot_sessions')
                .update({ peer_id: canonicalPeer })
                .eq('id', (existing as any).id);
              (existing as any).peer_id = canonicalPeer;
            }
          } catch {}
          return existing as SessionRecord;
        }
      }
      logger.debug('[SESSION] No existing session found, will create new one');
    } catch (e) {
      // .single() throws when no records found, which is expected
    }

    // create
    logger.debug('[SESSION] Creating new session...');
    const canonicalPeer = normalizePeerId(channel, peer_id);
    const payload = { channel, peer_id: canonicalPeer || peer_id, state: {} } as any;
    const { data } = await supabase.from('bot_sessions').insert(payload).select().single();
    logger.debug('[SESSION] Created new session:', { id: data?.id });
    return data as SessionRecord;
  } catch (error) {
    logger.error('[SESSION] Critical error in getOrCreateSession:', { error: String(error) });
    throw error;
  }
}

export async function setSessionState(session_id: string, state: any) {
  // Merge com estado existente para não perder flags como "greeted".
  // Usa optimistic locking via `state_version` quando a coluna existir.

  const isMockSupabase =
    process.env.MOCK_SUPABASE === 'true' ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY;

  const readCurrent = async (): Promise<{ prev: any; version: number | null; exists: boolean }> => {
    try {
      const { data, error } = await supabase
        .from('bot_sessions')
        .select('state,state_version')
        .eq('id', session_id)
        .single();
      if (error) throw error;
      const exists = !!data;
      const prev = (data as any)?.state || {};
      const rawV = (data as any)?.state_version;
      const version = typeof rawV === 'number' ? rawV : rawV == null ? 0 : Number(rawV);
      return { prev, version: Number.isFinite(version) ? version : 0, exists };
    } catch (e: any) {
      if (looksLikeMissingColumnError(e, 'state_version')) {
        const { data } = await supabase
          .from('bot_sessions')
          .select('state')
          .eq('id', session_id)
          .single();
        const prev = (data as any)?.state || {};
        return { prev, version: null, exists: !!data };
      }
      throw e;
    }
  };

  const attemptOptimisticUpdate = async (expectedVersion: number, next: any) => {
    const { data, error } = await supabase
      .from('bot_sessions')
      .update({ state: next, state_version: expectedVersion + 1 })
      .eq('id', session_id)
      .eq('state_version', expectedVersion)
      .select('id');
    if (error) throw error;
    const updatedCount = Array.isArray(data) ? data.length : data ? 1 : 0;
    if (!updatedCount) {
      throw new OptimisticLockError('Session state update conflict');
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const maxAttempts = 4;

  const bestEffortMergeWrite = async (reason: string) => {
    try {
      const { prev, version } = await readCurrent();
      const next = mergeStateWithStage(prev, state || {});

      if (typeof version === 'number') {
        await supabase
          .from('bot_sessions')
          .update({ state: next, state_version: version + 1 })
          .eq('id', session_id);
        logger.warn('[SESSION] best-effort state write (versioned)', { session_id, reason });
        return;
      }

      await supabase.from('bot_sessions').update({ state: next }).eq('id', session_id);
      logger.warn('[SESSION] best-effort state write (unversioned)', { session_id, reason });
    } catch (e: any) {
      logger.error('[SESSION] best-effort state write failed', {
        session_id,
        reason,
        error: String(e?.message || e),
      });
    }
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { prev, version, exists } = await readCurrent();
      const next = mergeStateWithStage(prev, state || {});

      // Em testes (MOCK_SUPABASE) alguns specs passam uma sessão "na mão" sem criar a row.
      // Nesse caso, criamos uma row mínima para que o optimistic locking funcione e o estado persista.
      if (!exists && isMockSupabase) {
        const payload: any = { id: session_id, channel: 'whatsapp', peer_id: session_id, state: next };
        if (typeof version === 'number') payload.state_version = version;
        await supabase.from('bot_sessions').insert(payload).select().single();
        return;
      }

      if (typeof version === 'number') {
        await attemptOptimisticUpdate(version, next);
        return;
      }
      await supabase.from('bot_sessions').update({ state: next }).eq('id', session_id);
      return;
    } catch (e: any) {
      if (looksLikeMissingColumnError(e, 'state_version')) {
        // Se a coluna não existir, re-ler o estado e aplicar merge sem versionamento.
        const { prev } = await readCurrent();
        const next = mergeStateWithStage(prev, state || {});
        await supabase.from('bot_sessions').update({ state: next }).eq('id', session_id);
        return;
      }

      if (e instanceof OptimisticLockError) {
        // Muitos writes podem ocorrer por inbound (adapter + orchestrator + logs).
        // Re-tentar algumas vezes com backoff curto evita perder atualizações como `dados_coletados.marca`.
        if (attempt < maxAttempts - 1) {
          logger.warn('[SESSION] state_version conflict; retrying', {
            session_id,
            attempt: attempt + 1,
            maxAttempts,
          });
          await sleep(25 + attempt * 50);
          continue;
        }

        // Após esgotar retries, tentar um merge-write sem condição de versionamento.
        await bestEffortMergeWrite('optimistic_lock_exhausted');
        return;
      }

      // Não sobrescrever estado a partir de {} em caso de erro: faz merge best-effort.
      logger.error('[SESSION] setSessionState error; best-effort merge write', {
        session_id,
        error: String(e?.message || e),
      });
      await bestEffortMergeWrite('unexpected_error');
      return;
    }
  }
}

export async function logMessage(
  session_id: string,
  direction: 'in' | 'out',
  body: string,
  meta?: any
) {
  await supabase.from('bot_messages').insert({ session_id, direction, body, meta: meta || null });
}


export async function resetSessionStateByPeer(channel: string, peer_id: string) {
  // Zera somente o estado; mantém o registro da sessão
  try {
    const variants = getPeerIdVariants(channel, peer_id);
    const { data } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('channel', channel)
      .eq('peer_id', variants[0] || peer_id)
      .single();

    // If not found for first variant, attempt the others
    let id = (data as any)?.id;
    if (!id) {
      for (const v of variants.slice(1)) {
        try {
          const { data: d2 } = await supabase
            .from('bot_sessions')
            .select('id')
            .eq('channel', channel)
            .eq('peer_id', v)
            .single();
          id = (d2 as any)?.id;
          if (id) break;
        } catch {}
      }
    }

    if (id) {
      await supabase.from('bot_sessions').update({ state: {} }).eq('id', id);
    }
  } catch (e) {
    // ignora
  }
}
