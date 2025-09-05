import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface FieldHintProps {
  text: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function FieldHint({ text, side = 'top' }: FieldHintProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center align-middle ml-1 text-muted-foreground hover:text-foreground"
            aria-label="Ajuda"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <div className="max-w-xs text-xs leading-relaxed">
            {text}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

