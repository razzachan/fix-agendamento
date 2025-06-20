
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StrictMode } from 'react';
import { PWAService } from './services/mobile/pwaService';

// Make sure there's a div with id="root" in the HTML
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Initialize PWA Service
PWAService.initialize().catch(error => {
  console.error('Erro ao inicializar PWA:', error);
});

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
