import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwind = require('tailwindcss');

await build({ entryPoints: ['assets/react/home-hero/main.jsx'], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: 'assets/js/home-hero.js', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked' });
const server = await build({ entryPoints: ['assets/react/home-hero/render.jsx'], bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false });
// Keep the temporary module beside the JSX entry so its package imports resolve.
const temporary = new URL('../assets/react/home-hero/.render-build.mjs', import.meta.url);
try {
  await fs.writeFile(temporary, server.outputFiles[0].text);
  const { html } = await import(temporary.href + '?v=' + Date.now());
  await fs.mkdir('app/Views', { recursive: true });
  await fs.writeFile('app/Views/home-hero.generated.html', html + '\n');
} finally { await fs.rm(temporary, { force: true }); }

const input = await fs.readFile('assets/react/home-hero/hero.css', 'utf8');
const css = await postcss([tailwind('./tailwind.hero.config.cjs')]).process(input, { from: 'assets/react/home-hero/hero.css', to: 'assets/css/home-hero.css' });
await fs.writeFile('assets/css/home-hero.css', css.css);
console.log('Built homepage-only React hero, visible server markup, and scoped Tailwind CSS.');
