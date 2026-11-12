import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'
import alias from './alias'

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url))
}

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src'],
      entryRoot: 'src',
      exclude: ['**/*.test.ts', '**/__tests__/**'],
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias,
  },
  build: {
    lib: {
      entry: {
        index: resolvePath('./src/index.ts'),
        imports: resolvePath('./src/imports.ts'),
        resolvers: resolvePath('./src/resolvers.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: ['vue'],
    },
    minify: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
})
