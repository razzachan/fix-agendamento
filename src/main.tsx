
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StrictMode } from 'react';
import { PWAService } from './services/mobile/pwaService';
import { GoogleAdsConversionService } from './services/googleAdsConversionService';
import { GoogleAdsTest } from './test/googleAdsTest';

// Make sure there's a div with id="root" in the HTML
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Initialize PWA Service
PWAService.initialize().catch(error => {
  console.error('Erro ao inicializar PWA:', error);
});

// 🎯 GOOGLE ADS CONVERSIONS - TESTE COMPLETO NO MAIN.TSX
console.log('🎯 [Main] EXECUTANDO TESTES GOOGLE ADS CONVERSIONS!');

const runGoogleAdsTests = async () => {
  try {
    console.log('🧪 [Main] Iniciando testes de conversões...');

    // Executar todos os testes
    await GoogleAdsTest.runAllTests();

    console.log('✅ [Main] Testes Google Ads concluídos!');

  } catch (error) {
    console.error('❌ [Main] Erro nos testes Google Ads:', error);
  }
};

// Executar os testes do Google Ads
runGoogleAdsTests();

// Use StrictMode in development for better debugging
const isProduction = import.meta.env.PROD;

if (isProduction) {
  createRoot(rootElement).render(<App />);
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
