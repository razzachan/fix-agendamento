
import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface DiagnosisPartsLinkProps {
  partsLink?: string;
}

const DiagnosisPartsLink: React.FC<DiagnosisPartsLinkProps> = ({ partsLink }) => {
  if (!partsLink) return null;

  return (
    <div className="mt-2">
      <a 
        href={partsLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        <span className="underline">Link para compra de peças</span>
      </a>
    </div>
  );
};

export default DiagnosisPartsLink;
