import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** GitHub Pages serves the site under /<repo>/ — set BASE_PATH in CI. */
const base = process.env['BASE_PATH'] ?? '/';

/** Hosts the app talks to (see docs/SECURITY.md). */
const CONNECT = ['https://raw.githubusercontent.com', 'https://pepegapi.jeanropke.net', 'https://rdo-dailies.com'];

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Leaflet positions tiles/markers with inline styles
  "img-src 'self' data: blob: https:", // map tiles (Rockstar or user-defined https template)
  "font-src 'self'",
  `connect-src 'self' ${CONNECT.join(' ')}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function csp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'leaflet', test: /node_modules[\\/]leaflet/ }] },
      },
    },
  },
  plugins: [
    preact(),
    csp(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: './',
        name: 'RDR2 Collector’s Ultimate',
        short_name: 'Collector’s',
        description: 'Carte de collection personnelle pour Red Dead Online — sans publicité, installable et hors ligne.',
        lang: 'fr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#17110c',
        background_color: '#17110c',
        categories: ['games', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + fonts + icons + all collectible data are precached: the app works offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/**/*.json'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Map tiles already viewed (Rockstar or custom template). Bounded, personal cache — no bulk download.
            urlPattern: ({ request, url }) => request.destination === 'image' && url.origin !== self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rdr2u-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 24 * 3600, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
