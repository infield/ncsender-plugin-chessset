// Bundles src/ into com.infield.chessset/lib/app.js (implementation plan P2, D12).
// Usage: node build.mjs   (normally run through ./build.sh)
import { build } from 'esbuild';
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PLUGIN = 'com.infield.chessset';
if (!existsSync(`${PLUGIN}/manifest.json`)) {
  console.error(`${PLUGIN}/manifest.json not found.`);
  process.exit(1);
}

mkdirSync(`${PLUGIN}/lib`, { recursive: true });
const version = JSON.parse(readFileSync(`${PLUGIN}/manifest.json`, 'utf8')).version;
const tag = `${version}-${Date.now().toString(36)}`;

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110'],
  minify: true,
  legalComments: 'eof',
  define: { __BUILD__: JSON.stringify(tag) },
  outfile: `${PLUGIN}/lib/app.js`,
});

// config.html reloads lib/app.js only when the build tag changes (Detail 2).
const htmlPath = `${PLUGIN}/config.html`;
writeFileSync(htmlPath, readFileSync(htmlPath, 'utf8').replace(/var BUILD = '[^']*';/, `var BUILD = '${tag}';`));

// The plugin ships copies of the repository's dual-licence files (D11).
for (const f of ['LICENSE', 'LICENSE-GPL-3.0']) copyFileSync(f, `${PLUGIN}/${f}`);

const size = readFileSync(`${PLUGIN}/lib/app.js`).length;
console.log(`${PLUGIN}/lib/app.js ${(size / 1024).toFixed(0)} KB, build ${tag}`);
