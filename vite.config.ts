import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// Plugin to copy manifest and icons
function copyManifestAndIcons() {
  return {
    name: 'copy-manifest-and-icons',
    writeBundle() {
      // Copy manifest.json using readFileSync and writeFileSync to ensure complete copy
      const manifestContent = readFileSync('manifest.json', 'utf8');
      writeFileSync('dist/manifest.json', manifestContent);
      
      // Copy icons directory
      try {
        mkdirSync('dist/icons', { recursive: true });
        copyFileSync('public/icons/icon16.png', 'dist/icons/icon16.png');
        copyFileSync('public/icons/icon48.png', 'dist/icons/icon48.png');
        copyFileSync('public/icons/icon128.png', 'dist/icons/icon128.png');
      } catch (error) {
        console.warn('Could not copy icons:', error);
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyManifestAndIcons()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        'bg/bg': resolve(__dirname, 'src/bg/serviceWorker.ts'),
        'content/loader': resolve(__dirname, 'src/content/loader.ts'),
        'content/monitor': resolve(__dirname, 'src/content/monitor.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});