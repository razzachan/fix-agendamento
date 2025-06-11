
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-muted animate-pulse"></div>
          <Loader2 className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
        </div>
        <p className="mt-4 text-base text-muted-foreground font-medium">Carregando dados...</p>
      </div>
    </div>
  );
};

export default LoadingState;
