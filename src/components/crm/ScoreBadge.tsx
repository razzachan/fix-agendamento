import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getScoreCategory, SCORE_CONFIG } from '@/types/crm';

export function ScoreBadge({ score }: { score: number }) {
  const category = getScoreCategory(score);
  const cfg = SCORE_CONFIG[category];
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <span>{cfg.icon}</span>
      <span>{score}</span>
    </Badge>
  );
}
