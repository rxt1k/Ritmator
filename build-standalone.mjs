// Builds Ritmator-standalone.html: one file, works offline, no CDN needed.
// Usage:  node build-standalone.mjs            (downloads three@0.147.0 via npm, needs internet once)
//         LIB_DIR=./lib node build-standalone.mjs   (use your own copies of the 4 files)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const NAMES = ['three.min.js', 'GLTFLoader.js', 'OrbitControls.js', 'GLTFExporter.js'];
const PATHS = {
  'three.min.js': 'build/three.min.js',
  'GLTFLoader.js': 'examples/js/loaders/GLTFLoader.js',
  'OrbitControls.js': 'examples/js/controls/OrbitControls.js',
  'GLTFExporter.js': 'examples/js/exporters/GLTFExporter.js',
};

let read;
if (process.env.LIB_DIR) {
  read = n => fs.readFileSync(path.join(process.env.LIB_DIR, n), 'utf8');
} else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ritmator-'));
  console.log('Downloading three@0.147.0 ...');
  execSync('npm pack three@0.147.0 --silent', { cwd: tmp, stdio: 'inherit' });
  const tgz = fs.readdirSync(tmp).find(f => f.endsWith('.tgz'));
  execSync(`tar -xzf "${tgz}"`, { cwd: tmp }); // Windows 10+ and macOS/Linux all ship tar
  read = n => fs.readFileSync(path.join(tmp, 'package', PATHS[n]), 'utf8');
}

const esc = x => x.replace(/<\/(script)/gi, '<\\/$1');
const libs = Object.fromEntries(NAMES.map(n => [n, read(n)]));
const html = fs.readFileSync(path.join(here, 'Ritmator.html'), 'utf8');

const marker = '<script>\n(function(){\n/* Loads Three.js';
const at = html.indexOf(marker);
if (at < 0) throw new Error('Could not find the loader block in Ritmator.html');

const inline =
  NAMES.map(n => `<script>/* ${n} */\n${esc(libs[n])}\n</script>\n`).join('') +
  `<script>window.__LIBS=${esc(JSON.stringify({ three: libs['three.min.js'], loader: libs['GLTFLoader.js'] }))};</script>\n`;

const out = html.slice(0, at) + inline + html.slice(at);
fs.writeFileSync(path.join(here, 'Ritmator-standalone.html'), out);
console.log('Wrote Ritmator-standalone.html (' + Math.round(out.length / 1024) + ' KB)');
