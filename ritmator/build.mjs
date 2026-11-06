// Builds dist/Ritmator-standalone.html: ONE file with CSS, Three.js and all js/ inlined (works offline, easy to share).
// Usage: node build.mjs        (no npm install needed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const esc = s => s.replace(/<\/(script)/gi, '<\\/$1');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>/* ${f} */\n${esc(read(f))}\n</script>`);
// the exported "Player .html" needs Three.js source in memory
const libs = { three: read('lib/three.min.js'), loader: read('lib/GLTFLoader.js') };
html = html.replace('<!-- Ritmator (order matters', `<script>window.__LIBS=${esc(JSON.stringify(libs))};</script>\n<!-- Ritmator (order matters`);

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
const out = path.join(here, 'dist', 'Ritmator-standalone.html');
fs.writeFileSync(out, html);
console.log('Wrote', out, '(' + Math.round(html.length / 1024) + ' KB)');
