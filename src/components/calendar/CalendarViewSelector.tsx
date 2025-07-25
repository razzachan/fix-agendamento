import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Clock, List } from 'lucide-react';
import { motion } from 'framer-motion';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

interface CalendarViewSelectorProps {
  currentView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  className?: string;
}

const CalendarViewSelector: React.FC<CalendarViewSelectorProps> = ({
  currentView,
  onViewChange,
  className = ''
}) => {
  const views = [
    { id: 'month' as CalendarViewMode, label: 'Mês', icon: Calendar },
    { id: 'week' as CalendarViewMode, label: 'Semana', icon: CalendarDays },
    { id: 'day' as CalendarViewMode, label: 'Dia', icon: Clock },
    { id: 'list' as CalendarViewMode, label: 'Lista', icon: List }
  ];

  return (
    <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;
        
        return (
          <motion.div
            key={view.id}
            layout
            className="relative"
          >
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(view.id)}
              className={`
                relative z-10 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }
              `}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </Button>
            
            {isActive && (
              <motion.div
                layoutId="activeViewIndicator"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default CalendarViewSelector;
