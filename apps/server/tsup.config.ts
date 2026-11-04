import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so it is compiled into the
  // bundle. Everything else is resolved from node_modules at runtime.
  noExternal: ['@eaternity/shared'],
});
