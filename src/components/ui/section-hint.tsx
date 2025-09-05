import React from 'react';
import { Info } from 'lucide-react';

interface SectionHintProps {
  title: string;
  description: string;
}

export function SectionHint({ title, description }: SectionHintProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium"><Info className="h-4 w-4"/> {title}</div>
      <div className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</div>
    </div>
  );
}

