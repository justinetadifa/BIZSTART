import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwind = require('tailwindcss');

await build({ entryPoints: ['assets/react/civic-metrics/main.tsx'], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: 'assets/js/home-glance.js', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked' });
const rendered = await build({ entryPoints: ['assets/react/civic-metrics/render.tsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
const temporary = new URL('../assets/react/civic-metrics/.render-build.mjs', import.meta.url);
try {
  await fs.writeFile(temporary, rendered.outputFiles[0].text);
  const { html } = await import(temporary.href + '?v=' + Date.now());
  await fs.writeFile('app/Views/civic-metrics.generated.html', html + '\n');
} finally { await fs.rm(temporary, { force: true }); }

const input = await fs.readFile('assets/react/civic-metrics/widgets.css', 'utf8');
const css = await postcss([tailwind('./tailwind.civic.config.cjs')]).process(input, { from: 'assets/react/civic-metrics/widgets.css', to: 'assets/css/civic-metrics.css' });
await fs.writeFile('assets/css/civic-metrics.css', css.css);
console.log('Built TypeScript civic widgets, scoped Tailwind CSS, and visible React server markup.');
