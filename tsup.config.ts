import { defineConfig, Options } from 'tsup';
import fs from 'fs';

export default defineConfig((options) => {
  const commonOptions: Partial<Options> = {
    entry: {
      'redux-thaga': 'src/index.ts',
    },
    ...options,
  };

  return [
    {
      ...commonOptions,
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
      dts: true,
      clean: true,
      onSuccess() {
        fs.copyFileSync(
          'dist/redux-thaga.mjs',
          'dist/redux-thaga.legacy-esm.js'
        );
      },
    },
    {
      ...commonOptions,
      format: 'cjs',
      outDir: './dist/cjs/',
      outExtension: () => ({ js: '.cjs' }),
    },
  ];
});
