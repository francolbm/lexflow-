import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  // O tsconfig do Next usa jsx "preserve"; para os testes de renderização o esbuild precisa transformar o JSX.
  esbuild: { jsx: 'automatic' },
  test: { include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'] },
})
