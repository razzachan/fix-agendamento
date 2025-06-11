
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StrictMode } from 'react';

// Make sure there's a div with id="root" in the HTML
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

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
