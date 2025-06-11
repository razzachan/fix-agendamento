import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'progress';
  height?: number;
  showValues?: boolean;
  className?: string;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({
  title,
  data,
  type,
  height = 200,
  showValues = true,
  className
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  const renderBarChart = () => (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((item, index) => {
        const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative w-full flex items-end justify-center">
              {showValues && item.value > 0 && (
                <span className="text-xs font-medium text-muted-foreground mb-1">
                  {item.value}
                </span>
              )}
              <div
                className={cn(
                  'w-full rounded-t-md transition-all duration-500 ease-out',
                  item.color || 'bg-primary'
                )}
                style={{ 
                  height: `${heightPercent}%`,
                  minHeight: item.value > 0 ? '4px' : '0px'
                }}
              />
            </div>
            <span className="text-xs text-center text-muted-foreground">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderLineChart = () => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Area under curve */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="currentColor"
            opacity="0.1"
            className="text-primary"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
          
          {/* Points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="currentColor"
                className="text-primary"
              />
            );
          })}
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-muted-foreground">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderProgressChart = () => (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{item.label}</span>
              {showValues && (
                <span className="text-sm text-muted-foreground">{item.value}</span>
              )}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-500 ease-out',
                  item.color || 'bg-primary'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className={cn('transition-all duration-300 hover:shadow-lg', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'bar' && renderBarChart()}
        {type === 'line' && renderLineChart()}
        {type === 'progress' && renderProgressChart()}
      </CardContent>
    </Card>
  );
};
