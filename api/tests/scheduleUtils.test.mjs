import assert from 'node:assert/strict';
import test from 'node:test';
import { computeSlots } from '../services/scheduleUtils.js';

await test('computeSlots respeita lunch e eventos', () => {
  process.env.CALENDAR_SLOT_MIN = '60';
  const date = '2025-08-14';
  const start = '08:00';
  const end = '18:00';
  const duration = 60;
  const events = [
    { start_time: `${date}T09:00:00`, end_time: `${date}T10:00:00` },
  ];
  const blackouts = [
    { start_time: `${date}T12:00:00`, end_time: `${date}T13:00:00` },
  ];
  const slots = computeSlots(date, start, end, duration, events, blackouts);
  assert.ok(Array.isArray(slots));
  assert.equal(slots.some(s=> s.start==='09:00'), false, 'não deve conter 09:00');
  assert.equal(slots.some(s=> s.start==='12:00'), false, 'não deve conter 12:00');
});

