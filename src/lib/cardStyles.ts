/**
 * Sistema de cores global para cards
 * Garante consistência entre light e dark mode
 */

export type StatusColor = 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple' | 'gray';

/**
 * Classes CSS para superfícies de cards
 */
export const cardSurface = {
  base: 'card-surface',
  elevated: 'card-surface-elevated',
  hover: 'card-hover',
} as const;

/**
 * Classes CSS para textos de cards
 */
export const cardText = {
  primary: 'card-text-primary',
  secondary: 'card-text-secondary',
  muted: 'card-text-muted',
} as const;

/**
 * Classes CSS para bordas de cards
 */
export const cardBorder = {
  base: 'card-border',
  accent: 'card-border-accent',
} as const;

/**
 * Gera classes CSS para status baseado na cor
 */
export const getStatusClasses = (color: StatusColor) => ({
  bg: `status-${color}-bg`,
  text: `status-${color}-text`,
  border: `status-${color}-border`,
  full: `status-${color}`,
});

/**
 * Classes CSS para badges de status
 */
export const statusBadge = {
  blue: 'status-blue border',
  green: 'status-green border',
  yellow: 'status-yellow border',
  red: 'status-red border',
  orange: 'status-orange border',
  purple: 'status-purple border',
  gray: 'status-gray border',
} as const;

/**
 * Utilitário para combinar classes de card
 */
export const combineCardClasses = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Classes pré-definidas para tipos comuns de cards
 */
export const cardPresets = {
  // Card básico
  basic: combineCardClasses(cardSurface.base, cardBorder.base),
  
  // Card elevado
  elevated: combineCardClasses(cardSurface.elevated, cardBorder.base),
  
  // Card com hover
  interactive: combineCardClasses(cardSurface.base, cardBorder.base, cardSurface.hover),
  
  // Cards de status
  statusBlue: combineCardClasses(cardSurface.base, 'status-blue-border', 'border-l-4'),
  statusGreen: combineCardClasses(cardSurface.base, 'status-green-border', 'border-l-4'),
  statusYellow: combineCardClasses(cardSurface.base, 'status-yellow-border', 'border-l-4'),
  statusRed: combineCardClasses(cardSurface.base, 'status-red-border', 'border-l-4'),
  statusOrange: combineCardClasses(cardSurface.base, 'status-orange-border', 'border-l-4'),
  statusPurple: combineCardClasses(cardSurface.base, 'status-purple-border', 'border-l-4'),
  statusGray: combineCardClasses(cardSurface.base, 'status-gray-border', 'border-l-4'),
} as const;

/**
 * Mapeamento de status de ordem de serviço para cores
 */
export const orderStatusColors: Record<string, StatusColor> = {
  'scheduled': 'blue',
  'on_the_way': 'yellow',
  'in_progress': 'green',
  'collected': 'purple',
  'at_workshop': 'orange',
  'completed': 'gray',
  'cancelled': 'red',
  'awaiting_approval': 'orange',
  'approved': 'green',
  'ready_for_delivery': 'blue',
} as const;

/**
 * Utilitário para obter classes de status baseado no status da ordem
 */
export const getOrderStatusClasses = (status: string) => {
  const color = orderStatusColors[status] || 'gray';
  return getStatusClasses(color);
};

/**
 * Classes para alertas e notificações
 */
export const alertClasses = {
  info: combineCardClasses(cardSurface.base, 'status-blue-bg', 'status-blue-border', 'border'),
  success: combineCardClasses(cardSurface.base, 'status-green-bg', 'status-green-border', 'border'),
  warning: combineCardClasses(cardSurface.base, 'status-yellow-bg', 'status-yellow-border', 'border'),
  error: combineCardClasses(cardSurface.base, 'status-red-bg', 'status-red-border', 'border'),
} as const;
