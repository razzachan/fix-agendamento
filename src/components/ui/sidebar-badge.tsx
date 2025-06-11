import React from 'react';
import { cn } from '@/lib/utils';

interface SidebarBadgeProps {
  count: number;
  className?: string;
  variant?: 'default' | 'urgent' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

/**
 * Componente de badge para o menu lateral
 * Exibe contadores de notificação com diferentes estilos e animações
 */
export function SidebarBadge({ 
  count, 
  className,
  variant = 'default',
  size = 'sm',
  animate = true
}: SidebarBadgeProps) {
  // Não renderizar se count for 0
  if (count <= 0) return null;

  // Limitar exibição a 99+
  const displayCount = count > 99 ? '99+' : count.toString();

  // Classes base
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-full',
    'font-medium',
    'text-white',
    'leading-none',
    'select-none',
    'shrink-0'
  ];

  // Classes de tamanho
  const sizeClasses = {
    sm: 'h-4 w-4 text-[10px] min-w-[16px]',
    md: 'h-5 w-5 text-xs min-w-[20px]',
    lg: 'h-6 w-6 text-sm min-w-[24px]'
  };

  // Classes de variante (cor)
  const variantClasses = {
    default: 'bg-red-500 hover:bg-red-600',
    urgent: 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25',
    warning: 'bg-orange-500 hover:bg-orange-600',
    success: 'bg-green-500 hover:bg-green-600'
  };

  // Classes de animação
  const animationClasses = animate ? [
    'transition-all',
    'duration-200',
    'animate-pulse'
  ] : [];

  // Combinar todas as classes
  const badgeClasses = cn(
    ...baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    ...animationClasses,
    className
  );

  return (
    <span className={badgeClasses}>
      {displayCount}
    </span>
  );
}

/**
 * Badge específico para itens do menu lateral
 * Posicionado automaticamente no canto superior direito
 */
export function SidebarMenuBadge({ 
  count, 
  variant = 'default',
  className 
}: Pick<SidebarBadgeProps, 'count' | 'variant' | 'className'>) {
  if (count <= 0) return null;

  return (
    <SidebarBadge
      count={count}
      variant={variant}
      size="sm"
      animate={true}
      className={cn(
        'absolute',
        '-top-1',
        '-right-1',
        'z-10',
        className
      )}
    />
  );
}

/**
 * Badge para categorias do menu (seções)
 */
export function SidebarCategoryBadge({ 
  count, 
  variant = 'default',
  className 
}: Pick<SidebarBadgeProps, 'count' | 'variant' | 'className'>) {
  if (count <= 0) return null;

  return (
    <SidebarBadge
      count={count}
      variant={variant}
      size="sm"
      animate={false}
      className={cn(
        'ml-auto',
        'opacity-80',
        className
      )}
    />
  );
}

export default SidebarBadge;
