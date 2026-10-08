import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('.', import.meta.url);
try {
  const config = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const { build, version } = await import('esbuild');
  if (version !== config.devDependencies.esbuild) {
    throw new Error(`Installed esbuild ${version} differs from the pinned ${config.devDependencies.esbuild}; run npm ci --include=dev --include=optional --ignore-scripts`);
  }
  await build({
    absWorkingDir: fileURLToPath(root),
    entryPoints: ['app.js'],
    outfile: 'app.bundle.js',
    bundle: true,
    format: 'esm',
    target: 'es2020',
    logLevel: 'info',
  });
} catch (error) {
  console.error('Viewer build failed:', error.message);
  if (error.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('Install viewer dependencies with npm ci --include=dev --include=optional --ignore-scripts');
  }
  process.exitCode = 1;
}
