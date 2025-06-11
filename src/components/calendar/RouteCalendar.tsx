import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RouteCalendarProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  availabilityData?: { [key: string]: { available: number; total: number } };
  isLoading?: boolean;
  className?: string;
  technicianId?: string;
}

export const RouteCalendar: React.FC<RouteCalendarProps> = ({
  selectedDate,
  onDateSelect,
  availabilityData = {},
  isLoading = false,
  className = '',
  technicianId
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const today = startOfDay(new Date());

  // Atualizar mês atual quando data selecionada muda
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular dias da semana anterior para completar a primeira semana
  const startDay = getDay(monthStart);
  const previousMonthDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (i + 1));
    previousMonthDays.push(day);
  }

  // Calcular dias da próxima semana para completar a última semana
  const endDay = getDay(monthEnd);
  const nextMonthDays = [];
  for (let i = 1; i <= (6 - endDay); i++) {
    const day = new Date(monthEnd);
    day.setDate(day.getDate() + i);
    nextMonthDays.push(day);
  }

  const allDays = [...previousMonthDays, ...daysInMonth, ...nextMonthDays];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    // Não permitir seleção de datas passadas
    if (isBefore(date, today)) return;
    
    // Não permitir seleção de dias de outros meses
    if (date.getMonth() !== currentMonth.getMonth()) return;

    onDateSelect(date);
  };

  const getDateAvailability = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return availabilityData[dateKey];
  };

  const getDateClasses = (date: Date) => {
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isPast = isBefore(date, today);
    const isOtherMonth = date.getMonth() !== currentMonth.getMonth();
    const isToday = isSameDay(date, today);
    const availability = getDateAvailability(date);

    let classes = 'flex items-center justify-center rounded-lg transition-all duration-200 relative font-medium ';

    if (isOtherMonth) {
      classes += 'text-gray-300 cursor-not-allowed ';
    } else if (isPast) {
      classes += 'text-gray-400 cursor-not-allowed bg-gray-50 ';
    } else if (isSelected) {
      classes += 'bg-green-500 text-white font-semibold shadow-lg ring-2 ring-green-200 ';
    } else if (isToday) {
      classes += 'bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 ';
    } else {
      classes += 'text-gray-700 hover:bg-green-50 cursor-pointer hover:scale-105 ';

      // Adicionar indicador de disponibilidade
      if (availability) {
        if (availability.available === 0) {
          classes += 'bg-red-50 text-red-700 border border-red-200 ';
        } else if (availability.available < availability.total * 0.5) {
          classes += 'bg-yellow-50 text-yellow-700 border border-yellow-200 ';
        } else {
          classes += 'bg-green-50 text-green-700 border border-green-200 ';
        }
      }
    }

    return classes;
  };

  const getAvailabilityIndicator = (date: Date) => {
    const availability = getDateAvailability(date);
    if (!availability || date.getMonth() !== currentMonth.getMonth() || isBefore(date, today)) return null;

    const percentage = (availability.available / availability.total) * 100;
    let color = 'bg-green-400';
    
    if (availability.available === 0) {
      color = 'bg-red-400';
    } else if (percentage < 50) {
      color = 'bg-yellow-400';
    }

    return (
      <div 
        className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${color} border border-white shadow-sm`}
      />
    );
  };

  const getTooltipText = (date: Date) => {
    const availability = getDateAvailability(date);
    const dateStr = format(date, 'dd/MM/yyyy', { locale: ptBR });
    
    if (isBefore(date, today)) {
      return `${dateStr} - Data passada`;
    }
    
    if (availability) {
      return `${dateStr} - ${availability.available} de ${availability.total} slots disponíveis`;
    }
    
    return dateStr;
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const isCompact = className?.includes('compact-calendar');

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${isCompact ? 'p-3' : 'p-4'} ${className}`}>
      {/* Header do calendário */}
      <div className={`flex items-center justify-between ${isCompact ? 'mb-2' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">Selecionar Data</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ChevronLeft className="h-3 w-3 text-gray-600" />
          </button>

          <h3 className={`text-sm font-semibold text-gray-900 text-center ${isCompact ? 'min-w-[100px]' : 'min-w-[120px]'}`}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>

          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ChevronRight className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div key={day} className={`text-xs font-semibold text-gray-500 text-center ${isCompact ? 'py-1' : 'py-2'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className={`grid grid-cols-7 gap-1 ${isCompact ? 'mb-2' : 'mb-3'}`}>
        {allDays.map((date, index) => (
          <div
            key={index}
            className={`${getDateClasses(date)} ${isCompact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}`}
            onClick={() => handleDateClick(date)}
            title={getTooltipText(date)}
          >
            {format(date, 'd')}
            {getAvailabilityIndicator(date)}
          </div>
        ))}
      </div>

      {/* Legenda e status - Compacta */}
      <div className={`${isCompact ? 'pt-2 border-t border-gray-100' : 'pt-3 border-t border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isCompact ? 'gap-2' : 'gap-4'}`}>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 border border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">Disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 border border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">Parcial</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 border border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">Ocupado</span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs text-blue-600">Verificando...</span>
            </div>
          )}
        </div>

        {selectedDate && isCompact && (
          <div className="mt-1 text-xs text-gray-500 text-center">
            <span className="font-medium text-green-600">
              {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}

        {selectedDate && !isCompact && (
          <div className="mt-2 text-xs text-gray-500">
            Data selecionada: <span className="font-medium text-green-600">
              {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
