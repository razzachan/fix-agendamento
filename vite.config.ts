
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Verificar se deve usar HTTPS
  const useHttps = process.argv.includes('--https') || process.env.VITE_HTTPS === 'true';

  // Configuração HTTPS se certificados existirem
  let httpsConfig = undefined;
  if (useHttps && fs.existsSync('./localhost.pem') && fs.existsSync('./localhost-key.pem')) {
    httpsConfig = {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    };
    console.log('🔒 HTTPS ativado - Câmera funcionará no mobile!');
  } else if (useHttps) {
    console.log('⚠️ Certificados HTTPS não encontrados. Execute: node setup-https.js');
  }

  return {
    server: {
      host: true, // Permite conexões externas
      port: 8082,
      cors: true, // Habilita CORS
      strictPort: false,
      https: httpsConfig,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
  plugins: [
    react({
      jsxImportSource: 'react',
    }),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              }
            }
          }
        ]
      },
      manifest: {
        name: 'EletroFix Hub Pro',
        short_name: 'EletroFix',
        description: 'Sistema de gestão para assistência técnica',
        theme_color: '#e5b034',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/fix fogoes.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/fix fogoes.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Otimizar chunking para reduzir tamanho
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          maps: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
          utils: ['date-fns', 'lodash']
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    chunkSizeWarningLimit: 1000
  }
  };
});
