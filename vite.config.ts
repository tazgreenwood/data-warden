import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js'
    },
    rollupOptions: {
      external: [
        'vscode',
        // Node.js built-ins
        'path',
        'fs',
        'child_process',
        'os',
        'crypto',
        'util',
        'events',
        'stream',
        'assert'
      ],
      output: {
        entryFileNames: '[name].js'
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    target: 'node18'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
