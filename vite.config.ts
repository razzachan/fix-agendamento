
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
      strictPort: true,
      https: httpsConfig,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/training-images': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
  plugins: [
    react({
      jsxImportSource: 'react',
    }),
    mode === 'development' &&
    componentTagger(),
    // PWA apenas em produção para evitar problemas de cache em desenvolvimento
    mode === 'production' && VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 // 6MB para permitir bundles grandes no precache
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /supabase/],
        // aumentar limite do Workbox para permitir js grande (apenas precache quando preciso)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
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
        name: 'Fix Fogões - Sistema de Gestão',
        short_name: 'Fix Fogões',
        description: 'Sistema completo de gestão para assistência técnica de fogões e eletrodomésticos',
        theme_color: '#E5B034',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Nova Ordem de Serviço', short_name: 'Nova OS', url: '/orders/new', icons: [{ src: '/icons/shortcut-new-order.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Agendamentos', short_name: 'Agenda', url: '/schedules', icons: [{ src: '/icons/shortcut-calendar.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Relatórios', short_name: 'Reports', url: '/reports', icons: [{ src: '/icons/shortcut-reports.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Rastreamento', short_name: 'Track', url: '/tracking', icons: [{ src: '/icons/shortcut-tracking.png', sizes: '96x96', type: 'image/png' }] }
        ],
        edge_side_panel: { preferred_width: 400 },
        launch_handler: { client_mode: 'navigate-existing' },
        handle_links: 'preferred',
        capture_links: 'existing-client-navigate'
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
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      mangle: {
        // Não minificar nomes de classes específicas
        reserved: ['GoogleAdsTrackingService']
      }
    }
  }
  };
});
