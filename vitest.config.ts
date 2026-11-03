import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/core/**', 'src/data/**'] },
  },
});
