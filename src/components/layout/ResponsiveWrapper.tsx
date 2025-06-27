import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  fullWidth?: boolean;
}

/**
 * Wrapper responsivo que garante comportamento adequado em mobile
 */
const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  className,
  noPadding = false,
  fullWidth = false
}) => {
  return (
    <div 
      className={cn(
        // Base classes
        "w-full mobile-container no-overflow",
        // Padding responsivo
        !noPadding && "px-2 sm:px-4 lg:px-6",
        // Largura máxima
        !fullWidth && "max-w-7xl mx-auto",
        // Classes customizadas
        className
      )}
    >
      <div className="mobile-safe-area">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;
