// タブレット等で配るための単一HTML(ES Modules をまとめたもの)を dist/moribin.html に出力する。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const order = ['rng', 'stars', 'planets', 'sol', 'galaxy', 'game', 'labels', 'galaxyView', 'systemView', 'panel', 'main'];
const js = order
  .map((n) => readFileSync(`src/${n}.js`, 'utf8').replace(/^import .*$/gm, '').replace(/^export\s+/gm, ''))
  .join('\n');
const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body>([\s\S]*?)<script type="module"/)[1];
const css = readFileSync('style.css', 'utf8');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/moribin.html', `<title>Moribin</title>\n<style>${css}</style>\n${body}\n<script>\n${js}\n</script>\n`);
console.log('dist/moribin.html', (js.length / 1024).toFixed(0) + 'KB js');
