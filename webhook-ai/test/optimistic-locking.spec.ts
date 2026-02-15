import { describe, expect, it } from 'vitest';
import { getOrCreateSession, setSessionState } from '../src/services/sessionStore.js';
import { supabase } from '../src/services/supabase.js';

describe('sessionStore optimistic locking', () => {
  it('increments state_version on setSessionState', async () => {
    const session = await getOrCreateSession('whatsapp', '5511999999999@c.us');

    await setSessionState(session.id, { greeted: true });

    const { data } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    expect((data as any).state.greeted).toBe(true);
    expect((data as any).state_version).toBe(1);
  });

  it('retries once on version conflict', async () => {
    const session = await getOrCreateSession('whatsapp', '5511888888888@c.us');

    const originalFrom = supabase.from.bind(supabase);
    let conflictOnce = true;

    // Force the first optimistic update to behave like a conflict (0 rows updated)
    (supabase as any).from = (name: string) => {
      const tbl = originalFrom(name);
      if (name !== 'bot_sessions') return tbl;

      const originalUpdate = tbl.update.bind(tbl);
      tbl.update = (payload: any) => {
        const ctx = originalUpdate(payload);
        if (typeof ctx?._exec === 'function') {
          const origExec = ctx._exec.bind(ctx);
          ctx._exec = async () => {
            const isOptimistic = Object.prototype.hasOwnProperty.call(ctx._query || {}, 'state_version');
            if (conflictOnce && isOptimistic) {
              conflictOnce = false;
              return { data: [] } as any;
            }
            return await origExec();
          };
        }
        return ctx;
      };

      return tbl;
    };

    try {
      await setSessionState(session.id, { foo: 'bar' });

      const { data } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      expect((data as any).state.foo).toBe('bar');
      expect((data as any).state_version).toBe(1);
      expect(conflictOnce).toBe(false);
    } finally {
      (supabase as any).from = originalFrom;
    }
  });
});
