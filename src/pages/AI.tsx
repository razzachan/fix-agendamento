// ===================================================================
// 🤖 PÁGINA PRINCIPAL DE IA E ANALYTICS (MVP 4)
// ===================================================================

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIDashboard } from '@/components/ai/AIDashboard';
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
 * Página principal de Inteligência Artificial
 * 
 * Esta página centraliza todas as funcionalidades de IA:
 * - Dashboard com métricas de IA
 * - Previsões de demanda automáticas
 * - Alertas inteligentes
 * - Recomendações de otimização
 * - Análises de performance
 * - Configurações de IA
 */
export default function AI() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Container principal */}
        <div className="container mx-auto px-4 py-6">
          <AIDashboard />
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
AI.displayName = 'AI';
AI.title = 'Inteligência Artificial';
AI.description = 'Sistema de IA com previsões, alertas e recomendações inteligentes';
AI.requiresAuth = true;
AI.allowedRoles = ['admin']; // Apenas administradores podem acessar IA
