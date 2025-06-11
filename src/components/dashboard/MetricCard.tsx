import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  isLoading?: boolean;
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-900 dark:text-blue-100',
    trend: 'text-blue-600 dark:text-blue-400'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-900 dark:text-green-100',
    trend: 'text-green-600 dark:text-green-400'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-900 dark:text-orange-100',
    trend: 'text-orange-600 dark:text-orange-400'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-900 dark:text-red-100',
    trend: 'text-red-600 dark:text-red-400'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-900 dark:text-purple-100',
    trend: 'text-purple-600 dark:text-purple-400'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-900 dark:text-indigo-100',
    trend: 'text-indigo-600 dark:text-indigo-400'
  }
};

const sizeVariants = {
  sm: {
    card: 'p-4',
    icon: 'w-8 h-8 p-1.5',
    iconSize: 'w-5 h-5',
    value: 'text-2xl',
    title: 'text-sm',
    subtitle: 'text-xs'
  },
  md: {
    card: 'p-6',
    icon: 'w-12 h-12 p-2.5',
    iconSize: 'w-7 h-7',
    value: 'text-3xl',
    title: 'text-base',
    subtitle: 'text-sm'
  },
  lg: {
    card: 'p-8',
    icon: 'w-16 h-16 p-3',
    iconSize: 'w-10 h-10',
    value: 'text-4xl',
    title: 'text-lg',
    subtitle: 'text-base'
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  size = 'md',
  onClick,
  isLoading = false
}) => {
  const colorClasses = colorVariants[color];
  const sizeClasses = sizeVariants[size];

  return (
    <Card 
      className={cn(
        'transition-all duration-300 hover:shadow-lg hover:scale-105',
        colorClasses.bg,
        colorClasses.border,
        onClick && 'cursor-pointer hover:shadow-xl',
        'group relative overflow-hidden'
      )}
      onClick={onClick}
    >
      {/* Gradient overlay for hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className={cn(sizeClasses.card, 'relative')}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                colorClasses.iconBg,
                sizeClasses.icon
              )}>
                <Icon className={cn(colorClasses.icon, sizeClasses.iconSize)} />
              </div>
              <div>
                <h3 className={cn(
                  'font-semibold',
                  colorClasses.text,
                  sizeClasses.title
                )}>
                  {title}
                </h3>
                {subtitle && (
                  <p className={cn(
                    'text-muted-foreground',
                    sizeClasses.subtitle
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className={cn(
                'font-bold transition-all duration-300',
                colorClasses.text,
                sizeClasses.value,
                isLoading && 'animate-pulse'
              )}>
                {isLoading ? '...' : value}
              </div>
              
              {trend && (
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-xs font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}>
                    {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {trend.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
