import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

const useMock = process.env.MOCK_SUPABASE === 'true';

function makeMock() {
  const sessions: any[] = [];
  const messages: any[] = [];
  let idCounter = 1;

  function matchRows(rows: any[], query: Record<string, any>) {
    return rows.filter((r) => Object.entries(query).every(([k, v]) => r[k] === v));
  }

  function table(name: string) {
    return {
      select(_cols?: string) {
        const ctx: any = {
          _name: name,
          _rows: name === 'bot_sessions' ? sessions : messages,
          _query: {},
          _limit: undefined,
        };
        ctx.eq = function (k: string, v: any) {
          this._query[k] = v;
          return this;
        };
        ctx.limit = function (n: number) {
          this._limit = n;
          return this;
        };
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
          select() {
            return this;
          },
          async single() {
            if (name === 'bot_sessions') {
              const row = {
                id: String(idCounter++),
                state_version: 0,
                ...payload,
              };
              if (row.state_version == null) row.state_version = 0;
              sessions.push(row);
              return { data: row } as any;
            } else if (name === 'bot_messages') {
              const row = { id: String(idCounter++), ...payload };
              messages.push(row);
              return { data: row } as any;
            }
            return { data: null } as any;
          },
        };
      },
      update(payload: any) {
        const ctx: any = {
          _name: name,
          _rows: name === 'bot_sessions' ? sessions : messages,
          _query: {},
          _payload: payload,
        };
        ctx.eq = function (k: string, v: any) {
          this._query[k] = v;
          return this;
        };
        ctx.select = function (_cols?: string) {
          return this;
        };
        ctx.single = async function () {
          const res = await this._exec();
          const data = Array.isArray(res.data) ? res.data[0] || null : res.data || null;
          return { data } as any;
        };
        ctx._exec = async function () {
          const rows = this._rows as any[];
          const matched = matchRows(rows, this._query);
          const updated: any[] = [];
          for (const r of matched) {
            Object.assign(r, this._payload);
            updated.push(r);
          }
          return { data: updated } as any;
        };
        // Make it awaitable: `await supabase.from(...).update(...).eq(...).select(...)`
        ctx.then = function (resolve: any, reject: any) {
          return this._exec().then(resolve, reject);
        };
        return ctx;
      },
    } as any;
  }

  return { from: table } as any;
}

let supabaseImpl: any;
const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

logger.info('[SUPABASE] Environment check:', {
  useMock,
  hasUrl: !!envUrl,
  hasKey: !!envKey
});

if (useMock || !envUrl || !envKey) {
  if (!useMock) {
    logger.warn('[SUPABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Using mock client.');
  }
  logger.info('[SUPABASE] Using mock client');
  supabaseImpl = makeMock();
} else {
  logger.info('[SUPABASE] Using real Supabase client');
  supabaseImpl = createClient(envUrl, envKey, { auth: { persistSession: false } });
}

export const supabase = supabaseImpl;
