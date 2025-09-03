
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import GoogleAdsTrackingProvider from './components/tracking/GoogleAdsTrackingProvider';
import { AutoConversionUpload } from './services/googleAds/googleAdsApiService';
import { trackingConfig } from './config/googleAds';
import { DynamicValueRangesService } from './services/dynamicValueRangesService';

// Pages
import Index from './pages/Index';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import MobileServiceOrders from './pages/MobileServiceOrders';

import ServiceOrderDetails from './pages/ServiceOrderDetails';
import ServiceOrderEdit from './pages/ServiceOrderEdit';
import ServiceOrderSchedule from './pages/ServiceOrderSchedule';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import Finance from './pages/Finance';
import TechnicianServiceOrders from './pages/TechnicianServiceOrders';

import TechnicianPurge from './pages/TechnicianPurge';
import Technicians from './pages/Technicians';
import MainCalendarPage from './pages/MainCalendarPage';
import Workshops from './pages/Workshops';
import Schedules from './pages/Schedules';
import RoutingPage from './pages/RoutingPage';
import AppointmentConfirmationPage from './pages/AppointmentConfirmationPage';
import SimpleConfirmationPage from './pages/SimpleConfirmationPage';
import BasicConfirmationPage from './pages/BasicConfirmationPage';
import IntermediateConfirmationPage from './pages/IntermediateConfirmationPage';
import ConfirmationPage from './pages/ConfirmationPage';
import RoutingTestPage from './pages/RoutingTestPage';
import MapTestPage from './pages/MapTestPage';
import SimpleMapTest from './pages/SimpleMapTest';
import Quotes from './pages/Quotes';
import RepairsAndDeliveries from './pages/RepairsAndDeliveries';
import TrackingPage from './pages/TrackingPage';
import SLAMonitoring from './pages/SLAMonitoring';
import MobileTest from './pages/MobileTest';
import NotFound from './pages/NotFound';
// Client Pages
import { ClientPortal } from './pages/client/ClientPortal';
import { ClientOrders } from './pages/client/ClientOrders';
import { ClientProfile } from './pages/client/ClientProfile';
import { ClientProfilePhoto } from './pages/client/ClientProfilePhoto';
import { ClientProfilePassword } from './pages/client/ClientProfilePassword';
import Reports from './pages/Reports';
import PWASettings from './pages/PWASettings';
import AI from './pages/AI';
import BotStudio from './pages/BotStudio';
import AIRouterDashboard from './pages/ai-router-dashboard';

import WhatsApp from './pages/WhatsApp';
import AdminBotTracing from './pages/AdminBotTracing';
import ForceLogout from './pages/ForceLogout';
// Components
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PWAUpdateManager } from '@/components/pwa/PWAUpdateManager';

const queryClient = new QueryClient();

function App() {
  // 🚨 LOG BÁSICO PARA DETECTAR SE APP.TSX EXECUTA
  console.log('🚀 [App] COMPONENTE APP.TSX EXECUTADO!');

  // 🤖 INICIALIZAR SISTEMAS AUTOMÁTICOS
  useEffect(() => {
    console.log('🎯 [App] useEffect EXECUTADO!');

    const initializeServices = async () => {
      try {
        console.log('🔄 [App] Iniciando inicialização dos serviços...');

        // 1. Inicializar faixas dinâmicas de valor
        console.log('🎯 [App] Inicializando faixas dinâmicas de valor...');
        await DynamicValueRangesService.initialize();
        console.log('✅ [App] Faixas dinâmicas inicializadas!');

        // 2. Inicializar cron de conversões se habilitado
        if (trackingConfig.enabled) {
          console.log('🚀 [App] Iniciando cron de conversões automáticas...');

          // Iniciar upload automático a cada 30 minutos
          AutoConversionUpload.startAutoUpload(trackingConfig.autoUploadInterval);

          console.log(`✅ [App] Cron iniciado: upload a cada ${trackingConfig.autoUploadInterval} minutos`);
        } else {
          console.log('⚠️ [App] Tracking desabilitado - cron não iniciado');
        }

        console.log('🎉 [App] Todos os serviços inicializados com sucesso!');

      } catch (error) {
        console.error('❌ [App] Erro na inicialização dos serviços:', error);
      }
    };

    initializeServices();

    // Cleanup quando o componente for desmontado
    return () => {
      AutoConversionUpload.stopAutoUpload();
      console.log('🛑 [App] Sistemas automáticos parados');
    };
  }, []);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <PWAUpdateManager autoUpdate={false} showToast={true} />
          <GoogleAdsTrackingProvider>
            <AuthProvider>
              <MapProvider>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/client/login" element={<Login />} />
              <Route path="/force-logout" element={<ForceLogout />} />

              {/* Rota pública de rastreamento por QR Code */}
              <Route path="/track/:qrCode" element={<TrackingPage />} />

              {/* Rota raiz - redireciona baseado no role */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><Index /></AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Dashboard para admin, técnicos e oficinas */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                }
              />



              {/* Rotas acessíveis a admin, técnicos e oficinas */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><ServiceOrders /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mobile-orders"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <MobileServiceOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders/new"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><ServiceOrders /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><ServiceOrderDetails /></AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Rotas acessíveis apenas a admin */}
              <Route
                path="/orders/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><ServiceOrderEdit /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/schedule/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><ServiceOrderSchedule /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Clients /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><ClientDetails /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Finance /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotes"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Quotes /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/repairs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><RepairsAndDeliveries /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deliveries"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><RepairsAndDeliveries /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technicians"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Technicians /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workshops"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Workshops /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Schedules /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Reports /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><Analytics /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><AI /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/whatsapp"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><WhatsApp /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bot"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><BotStudio /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bot-tracing"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><AdminBotTracing /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ai-router"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><AIRouterDashboard /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><SLAMonitoring /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pwa-settings"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><PWASettings /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/routing"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician']}>
                    <AppLayout><RoutingPage /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/confirmations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><ConfirmationPage /></AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* Rota de teste de roteirização removida para consolidar funcionalidades */}
              <Route
                path="/map-test"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><MapTestPage /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/simple-map"
                element={
                  <SimpleMapTest />
                }
              />


              {/* Rotas específicas para técnicos */}
              <Route
                path="/technician"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician']}>
                    <AppLayout><TechnicianServiceOrders /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technician/purge"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AppLayout><TechnicianPurge /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><MainCalendarPage /></AppLayout>
                  </ProtectedRoute>
                }
              />
              {/* Rota /main-calendar removida - agora /calendar usa MainCalendarPage */}

              {/* Rota de teste mobile */}
              <Route
                path="/mobile-test"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'technician', 'workshop']}>
                    <AppLayout><MobileTest /></AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Rotas do Portal do Cliente */}
              <Route
                path="/client/portal"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/orders"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/profile"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/profile/photo"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientProfilePhoto />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/profile/password"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientProfilePassword />
                  </ProtectedRoute>
                }
              />

              {/* Rota de fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </MapProvider>
          </AuthProvider>
        </GoogleAdsTrackingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
