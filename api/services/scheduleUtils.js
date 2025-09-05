export function computeSlots(date, start, end, durationMin, events, blackouts){
  const GRID_MIN = Number(process.env.CALENDAR_SLOT_MIN || 60);
  const toMinutes = (t)=>{ const [h,m]=t.split(':').map(Number); return h*60+m; };
  const startM = toMinutes(start), endM = toMinutes(end);
  const busy = [];
  for(const ev of events||[]){
    const s = new Date(ev.start_time); const e = new Date(ev.end_time);
    busy.push([s.getHours()*60+s.getMinutes(), e.getHours()*60+e.getMinutes()]);
  }
  for(const bl of blackouts||[]){
    const s = new Date(bl.start_time); const e = new Date(bl.end_time);
    busy.push([s.getHours()*60+s.getMinutes(), e.getHours()*60+e.getMinutes()]);
  }
  busy.sort((a,b)=>a[0]-b[0]);

  const alignUp = (m, step)=> Math.ceil(m/step)*step;
  const startAligned = alignUp(startM, GRID_MIN);

  const slots=[];
  for(let t=startAligned; t+durationMin<=endM; t+=GRID_MIN){
    const conflict = busy.some(([s,e])=> !(t+durationMin<=s || t>=e));
    if (!conflict) slots.push({ start: toTime(t), end: toTime(t+durationMin) });
  }
  return slots;
}

export function toTime(m){
  const h=Math.floor(m/60).toString().padStart(2,'0');
  const mm=(m%60).toString().padStart(2,'0');
  return `${h}:${mm}`;
}

