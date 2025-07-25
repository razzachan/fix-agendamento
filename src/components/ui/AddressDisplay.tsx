import React from 'react';
import { MapPin } from 'lucide-react';
import { AddressData, formatAddressMultiLine } from '@/utils/addressFormatter';

interface AddressDisplayProps {
  data: AddressData;
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Componente para exibir endereços formatados de forma consistente
 */
export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  data,
  showIcon = true,
  className = '',
  iconClassName = 'h-4 w-4 text-muted-foreground',
  variant = 'default'
}) => {
  const lines = formatAddressMultiLine(data);
  
  // Se não há endereço principal, não renderiza nada
  if (!lines.main) {
    return null;
  }

  const renderContent = () => {
    switch (variant) {
      case 'compact':
        return (
          <div className="flex items-start gap-2">
            {showIcon && <MapPin className={`${iconClassName} mt-0.5 flex-shrink-0`} />}
            <div className="min-w-0 flex-1">
              <span className="text-sm">
                {lines.main}
                {lines.complement && (
                  <span className="text-muted-foreground ml-1">({lines.complement.replace('Complemento: ', '')})</span>
                )}
              </span>
              {lines.location && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {lines.location}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'detailed':
        return (
          <div className="flex items-start gap-2">
            {showIcon && <MapPin className={`${iconClassName} mt-1 flex-shrink-0`} />}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-medium text-sm">{lines.main}</div>
              {lines.complement && (
                <div className="text-sm text-muted-foreground italic">
                  {lines.complement}
                </div>
              )}
              {lines.location && (
                <div className="text-sm text-muted-foreground">
                  {lines.location}
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-start gap-2">
            {showIcon && <MapPin className={`${iconClassName} mt-0.5 flex-shrink-0`} />}
            <div className="min-w-0 flex-1">
              <div className="text-sm">{lines.main}</div>
              {lines.complement && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {lines.complement}
                </div>
              )}
              {lines.location && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {lines.location}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {renderContent()}
    </div>
  );
};

export default AddressDisplay;
