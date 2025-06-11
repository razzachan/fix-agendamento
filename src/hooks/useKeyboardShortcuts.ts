import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

interface KeyboardShortcutsProps {
  onViewChange: (view: CalendarViewMode) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onRefresh: () => void;
  onToggleAnalytics?: () => void;
  onToggleNotifications?: () => void;
  onSearch?: () => void;
  currentView: CalendarViewMode;
}

interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export const useKeyboardShortcuts = ({
  onViewChange,
  onNavigate,
  onRefresh,
  onToggleAnalytics,
  onToggleNotifications,
  onSearch,
  currentView
}: KeyboardShortcutsProps) => {
  
  const shortcuts: ShortcutAction[] = [
    // Navegação de visualizações
    {
      key: '1',
      description: 'Visualização Mensal',
      action: () => onViewChange('month')
    },
    {
      key: '2',
      description: 'Visualização Semanal',
      action: () => onViewChange('week')
    },
    {
      key: '3',
      description: 'Visualização Diária',
      action: () => onViewChange('day')
    },
    {
      key: '4',
      description: 'Visualização em Lista',
      action: () => onViewChange('list')
    },

    // Navegação temporal
    {
      key: 'ArrowLeft',
      description: 'Período Anterior',
      action: () => onNavigate('prev')
    },
    {
      key: 'ArrowRight',
      description: 'Próximo Período',
      action: () => onNavigate('next')
    },
    {
      key: 't',
      description: 'Ir para Hoje',
      action: () => onNavigate('today')
    },
    {
      key: 'Home',
      description: 'Ir para Hoje',
      action: () => onNavigate('today')
    },

    // Ações gerais
    {
      key: 'r',
      description: 'Atualizar Calendário',
      action: onRefresh
    },
    {
      key: 'F5',
      description: 'Atualizar Calendário',
      action: onRefresh
    },

    // Ações com Ctrl
    {
      key: 'r',
      description: 'Atualizar Calendário',
      action: onRefresh,
      ctrlKey: true
    },

    // Busca
    ...(onSearch ? [{
      key: 'f',
      description: 'Buscar',
      action: onSearch,
      ctrlKey: true
    }] : []),

    // Analytics
    ...(onToggleAnalytics ? [{
      key: 'a',
      description: 'Toggle Analytics',
      action: onToggleAnalytics,
      ctrlKey: true
    }] : []),

    // Notificações
    ...(onToggleNotifications ? [{
      key: 'n',
      description: 'Toggle Notificações',
      action: onToggleNotifications,
      ctrlKey: true
    }] : []),

    // Ajuda
    {
      key: '?',
      description: 'Mostrar Atalhos',
      action: () => showShortcutsHelp(),
      shiftKey: true
    },
    {
      key: 'h',
      description: 'Mostrar Atalhos',
      action: () => showShortcutsHelp()
    }
  ];

  const showShortcutsHelp = useCallback(() => {
    const helpText = shortcuts
      .filter(s => s.description !== 'Mostrar Atalhos')
      .map(shortcut => {
        let keyCombo = '';
        if (shortcut.ctrlKey) keyCombo += 'Ctrl + ';
        if (shortcut.shiftKey) keyCombo += 'Shift + ';
        if (shortcut.altKey) keyCombo += 'Alt + ';
        keyCombo += shortcut.key;

        return `${keyCombo}: ${shortcut.description}`;
      })
      .join('\n');

    toast('Atalhos de Teclado', {
      description: helpText,
      duration: 10000
    });
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignorar se estiver digitando em um input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    // Encontrar atalho correspondente
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const altMatch = !!shortcut.altKey === event.altKey;
      
      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
      
      // Mostrar feedback visual
      let keyCombo = '';
      if (event.ctrlKey) keyCombo += 'Ctrl + ';
      if (event.shiftKey) keyCombo += 'Shift + ';
      if (event.altKey) keyCombo += 'Alt + ';
      keyCombo += event.key;
      
      toast.success(`${keyCombo}: ${matchingShortcut.description}`, {
        duration: 1500
      });
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Mostrar dica de atalhos na primeira vez
  useEffect(() => {
    const hasSeenShortcuts = localStorage.getItem('calendar-shortcuts-seen');
    if (!hasSeenShortcuts) {
      setTimeout(() => {
        toast.info('💡 Dica: Pressione "h" ou "?" para ver os atalhos de teclado', {
          duration: 5000,
          action: {
            label: 'Ver Atalhos',
            onClick: showShortcutsHelp
          }
        });
        localStorage.setItem('calendar-shortcuts-seen', 'true');
      }, 2000);
    }
  }, [showShortcutsHelp]);

  return {
    shortcuts: shortcuts.map(s => ({
      key: s.key,
      description: s.description,
      ctrlKey: s.ctrlKey,
      shiftKey: s.shiftKey,
      altKey: s.altKey
    })),
    showShortcutsHelp
  };
};

// Hook para mostrar indicador de atalhos
export const useShortcutIndicator = () => {
  const showIndicator = useCallback((key: string, description: string) => {
    const indicator = document.createElement('div');
    indicator.className = `
      fixed top-4 right-4 z-50 bg-black text-white px-3 py-2 rounded-lg shadow-lg
      text-sm font-medium opacity-0 transition-opacity duration-200
    `;
    indicator.innerHTML = `
      <div class="flex items-center gap-2">
        <kbd class="bg-gray-700 px-2 py-1 rounded text-xs">${key}</kbd>
        <span>${description}</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Animar entrada
    setTimeout(() => {
      indicator.style.opacity = '1';
    }, 10);
    
    // Remover após 2 segundos
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(indicator);
      }, 200);
    }, 2000);
  }, []);

  return { showIndicator };
};

// Função para obter lista de atalhos formatada
export const getShortcutsText = (shortcuts: any[]) => {
  return shortcuts.map(shortcut => {
    let keyCombo = '';
    if (shortcut.ctrlKey) keyCombo += 'Ctrl + ';
    if (shortcut.shiftKey) keyCombo += 'Shift + ';
    if (shortcut.altKey) keyCombo += 'Alt + ';
    keyCombo += shortcut.key;

    return `${keyCombo}: ${shortcut.description}`;
  }).join('\n');
};
