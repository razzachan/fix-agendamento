export const ConversationStages = [
  'collecting_core',
  'quoted',
  'collecting_personal',
  'confirming_slot',
  'scheduled',
  'handoff_paused',
] as const;

export type ConversationStage = (typeof ConversationStages)[number];

export function isConversationStage(v: any): v is ConversationStage {
  return ConversationStages.includes(v);
}

export function deriveStageFromLegacy(state: any): ConversationStage {
  const st = state && typeof state === 'object' ? state : {};
  if (st.handoff_paused) return 'handoff_paused';
  if (st.schedule_confirmed || st.last_appointment_id || st.last_schedule_confirmed_at)
    return 'scheduled';

  const hasSlots =
    (Array.isArray(st.last_offered_slots) && st.last_offered_slots.length > 0) ||
    (Array.isArray(st.last_offered_slots_full) && st.last_offered_slots_full.length > 0);
  if (st.pending_time_selection || hasSlots) return 'confirming_slot';

  if (st.collecting_personal_data) return 'collecting_personal';
  if (st.orcamento_entregue) return 'quoted';
  return 'collecting_core';
}

export function getStage(state: any): ConversationStage {
  const st = state && typeof state === 'object' ? state : {};
  const s = (st as any).stage;
  if (isConversationStage(s)) return s;
  return deriveStageFromLegacy(st);
}

export function applyStageToLegacyFlags(state: any): any {
  const st = state && typeof state === 'object' ? { ...state } : {};
  const stage = getStage(st);

  st.stage = stage;
  st.stage_ts = st.stage_ts || Date.now();

  if (stage === 'collecting_core') {
    st.collecting_personal_data = false;
    st.accepted_service = false;
    st.pending_time_selection = false;
    st.last_offered_slots = st.last_offered_slots || [];
    st.last_offered_slots_full = st.last_offered_slots_full || [];
    st.schedule_confirmed = false;
  }

  if (stage === 'quoted') {
    st.orcamento_entregue = !!st.orcamento_entregue;
    st.collecting_personal_data = false;
  }

  if (stage === 'collecting_personal') {
    st.accepted_service = true;
    st.collecting_personal_data = true;
  }

  if (stage === 'confirming_slot') {
    // keep pending_time_selection if already present; otherwise infer from slots
    const hasSlots =
      (Array.isArray(st.last_offered_slots) && st.last_offered_slots.length > 0) ||
      (Array.isArray(st.last_offered_slots_full) && st.last_offered_slots_full.length > 0);
    if (hasSlots && st.pending_time_selection == null) st.pending_time_selection = true;
  }

  if (stage === 'scheduled') {
    st.schedule_confirmed = true;
    st.pending_time_selection = false;
    st.last_offered_slots = [];
    st.last_offered_slots_full = [];
  }

  if (stage === 'handoff_paused') {
    st.handoff_paused = true;
  }

  return st;
}

export function mergeStateWithStage(prevState: any, patchState: any): any {
  const prev = prevState && typeof prevState === 'object' ? prevState : {};
  const patch = patchState && typeof patchState === 'object' ? patchState : {};

  const merged = { ...prev, ...patch };

  // Decide next stage:
  // - If patch explicitly provides a valid stage, respect it.
  // - Otherwise derive from legacy flags after merging.
  const nextStage: ConversationStage = isConversationStage(patch.stage)
    ? patch.stage
    : deriveStageFromLegacy(merged);

  if (nextStage !== merged.stage) {
    merged.stage = nextStage;
    merged.stage_ts = Date.now();
  }

  // Always keep legacy flags consistent with the stage.
  return applyStageToLegacyFlags(merged);
}
