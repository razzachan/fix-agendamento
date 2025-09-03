import React from 'react';

export function StoveTypeBadge({ type, segment }: { type?: string; segment?: string }){
  if (!type && !segment) return null;
  const label = `${type || '—'} / ${segment || '—'}`;
  return (
    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
      {label}
    </span>
  );
}

