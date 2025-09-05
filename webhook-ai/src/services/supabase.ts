import { createClient } from '@supabase/supabase-js';

const useMock = process.env.MOCK_SUPABASE === 'true';

function makeMock() {
  const sessions: any[] = [];
  const messages: any[] = [];
  let idCounter = 1;

  function matchRows(rows: any[], query: Record<string, any>) {
    return rows.filter(r => Object.entries(query).every(([k, v]) => r[k] === v));
  }

  function table(name: string) {
    return {
      select(_cols?: string) {
        const ctx: any = { _name: name, _rows: name === 'bot_sessions' ? sessions : messages, _query: {}, _limit: undefined };
        ctx.eq = function (k: string, v: any) { this._query[k] = v; return this; };
        ctx.limit = function (n: number) { this._limit = n; return this; };
        ctx.single = async function () {
          let rows = matchRows(this._rows, this._query);
          if (this._limit) rows = rows.slice(0, this._limit);
          const data = rows[0] || null;
          return { data } as any;
        };
        return ctx;
      },
      insert(payload: any) {
        return {
          select() { return this; },
          async single() {
            if (name === 'bot_sessions') {
              const row = { id: String(idCounter++), ...payload };
              sessions.push(row);
              return { data: row } as any;
            } else if (name === 'bot_messages') {
              const row = { id: String(idCounter++), ...payload };
              messages.push(row);
              return { data: row } as any;
            }
            return { data: null } as any;
          }
        };
      },
      update(payload: any) {
        return {
          async eq(k: string, v: any) {
            const rows = name === 'bot_sessions' ? sessions : messages;
            let updated: any[] = [];
            for (const r of rows) {
              if (r[k] === v) { Object.assign(r, payload); updated.push(r); }
            }
            return { data: updated } as any;
          }
        };
      }
    } as any;
  }

  return { from: table } as any;
}

let supabaseImpl: any;
if (useMock) {
  supabaseImpl = makeMock();
} else {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  supabaseImpl = createClient(url, key, { auth: { persistSession: false } });
}

export const supabase = supabaseImpl;

