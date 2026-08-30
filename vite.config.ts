import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(() => {
  return {
    base: './',
    // Use PostCSS (postcss.config.cjs) for Tailwind processing to avoid loading
    // @tailwindcss/vite which depends on native optional bindings (@tailwindcss/oxide).
    plugins: [react(), viteSingleFile()],
    esbuild: {
      charset: 'ascii',
    },
    build: {
      target: 'es2015',
      modulePreload: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
