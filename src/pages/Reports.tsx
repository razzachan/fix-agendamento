// ===================================================================
// 📊 PÁGINA PRINCIPAL DE RELATÓRIOS AVANÇADOS (MVP 4)
// ===================================================================

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsLayout } from '@/components/reports/ReportsLayout';
import { Toaster } from '@/components/ui/sonner';

// Criar instância do QueryClient para esta página
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
});

/**
 * Página principal de relatórios avançados
 * 
 * Esta página centraliza todas as funcionalidades de BI e Analytics:
 * - Geração de relatórios por categoria
 * - Filtros avançados e personalizáveis
 * - Agendamento de relatórios automáticos
 * - Exportação em múltiplos formatos
 * - Histórico de exportações
 * - Configurações de relatórios
 */
export default function Reports() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Container principal */}
        <div className="container mx-auto px-4 py-6">
          <ReportsLayout />
        </div>

        {/* Toaster para notificações */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))'
            }
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

/**
 * Metadados da página para SEO e navegação
 */
Reports.displayName = 'Reports';
Reports.title = 'Relatórios Avançados';
Reports.description = 'Sistema completo de Business Intelligence e Analytics';
Reports.requiresAuth = true;
Reports.allowedRoles = ['admin']; // Apenas administradores podem acessar relatórios avançados
