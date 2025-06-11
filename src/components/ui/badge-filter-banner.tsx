import React from 'react';
import { X, AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BadgeFilterBannerProps {
  isActive: boolean;
  label: string;
  description: string;
  count: number;
  onClear: () => void;
  className?: string;
}

/**
 * Banner que aparece no topo das páginas quando um filtro de badge está ativo
 * Mostra claramente o que está sendo filtrado e permite limpar o filtro
 */
export function BadgeFilterBanner({
  isActive,
  label,
  description,
  count,
  onClear,
  className
}: BadgeFilterBannerProps) {
  if (!isActive) return null;

  return (
    <div className={cn(
      "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-6 shadow-sm",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Ícone de alerta */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-semibold text-red-900">
                Filtro Ativo: {label}
              </h3>
              <Badge variant="destructive" className="text-xs">
                {count} {count === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            
            <p className="text-sm text-red-700 leading-relaxed">
              {description}
            </p>

            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 inline-block">
              💡 Você chegou aqui clicando no badge vermelho do menu lateral
            </div>
          </div>
        </div>

        {/* Botão para limpar filtro */}
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
          >
            <X className="w-3 h-3 mr-1" />
            Ver Todos
          </Button>
        </div>
      </div>

      {/* Indicador visual adicional */}
      <div className="mt-3 pt-3 border-t border-red-200">
        <div className="flex items-center gap-2 text-xs text-red-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Mostrando apenas itens que precisam de atenção imediata</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Versão compacta do banner para espaços menores
 */
export function BadgeFilterBannerCompact({
  isActive,
  label,
  count,
  onClear,
  className
}: Pick<BadgeFilterBannerProps, 'isActive' | 'label' | 'count' | 'onClear' | 'className'>) {
  if (!isActive) return null;

  return (
    <div className={cn(
      "bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4 flex items-center justify-between",
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-sm font-medium text-red-900">
          {label}
        </span>
        <Badge variant="destructive" className="text-xs">
          {count}
        </Badge>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-red-700 hover:bg-red-100 h-6 px-2"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default BadgeFilterBanner;
