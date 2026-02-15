import { supabase } from './supabase.js';
import { logger } from './logger.js';

/**
 * Ensures there is at least one admin user.
 * - If none exists, creates a default admin with email contato@fixfogoes.com.br
 * - If more than one exists, logs a warning (no destructive action).
 *
 * Skips when NODE_ENV === 'test' to avoid interfering with tests/mocks.
 */
export async function runAdminSeedOnBoot() {
  try {
    if (process.env.NODE_ENV === 'test') {
      return; // do not seed during tests
    }
    if (process.env.ADMIN_SEED_DISABLE === 'true') {
      return;
    }

    // Try to get all admins (only works on real Supabase client). The mock client
    // used in tests does not support array selects and will be skipped above.
    const { data: admins, error } = await (supabase as any)
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin');

    if (error) {
      logger.warn('[ADMIN-SEED] Could not query admins:', error?.message || error);
      return;
    }

    const count = Array.isArray(admins) ? admins.length : 0;

    if (count === 0) {
      const email = process.env.FIX_HANDOFF_EMAIL || 'contato@fixfogoes.com.br';
      const payload: any = { email, role: 'admin' };
      try {
        const { data: created, error: insErr } = await (supabase as any)
          .from('users')
          .insert(payload)
          .select()
          .single();
        if (insErr) {
          logger.warn('[ADMIN-SEED] Failed to insert default admin:', insErr?.message || insErr);
        } else {
          logger.info('[ADMIN-SEED] Default admin created:', { id: created?.id, email });
        }
      } catch (e: any) {
        logger.warn('[ADMIN-SEED] Insert threw:', e?.message || e);
      }
    } else if (count > 1) {
      logger.warn('[ADMIN-SEED] More than one admin detected. Consider consolidating to a single admin for now.', {
        total_admins: count,
      });
    } else {
      // Exactly one admin: OK
      const admin = admins?.[0];
      logger.info('[ADMIN-SEED] Admin present:', { id: admin?.id, email: admin?.email });
    }
  } catch (e: any) {
    logger.warn('[ADMIN-SEED] Unexpected error:', e?.message || e);
  }
}

