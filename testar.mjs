import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('/tmp/atual/dist/index.html', 'utf-8');
const js = fs.readFileSync('/tmp/atual/dist/assets/index-DVG4PEfg-1789783864690.js', 'utf-8');

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  pretendToBeVisual: true,
  url: "https://comluxijewelry.pages.dev/"
});

const { window } = dom;
const erros = [];
window.addEventListener('error', (e) => erros.push('ERROR: ' + (e.error?.message || e.message)));

window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try {
  Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true });
} catch(e){}
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}), ok: true });
window.scrollTo = () => {};

try {
  const script = new window.Function(js);
  script.call(window);
  console.log("JS EXECUTOU SEM CRASH IMEDIATO");
} catch (e) {
  console.log("=== CRASH NA EXECUÇÃO ===");
  console.log(e.message);
  console.log((e.stack||'').split('\n').slice(0,3).join('\n'));
}

setTimeout(() => {
  console.log("\n=== ERROS ===");
  erros.slice(0,5).forEach(e => console.log(e));
  const root = window.document.getElementById('root');
  console.log("\n=== #root ===");
  console.log(root && root.innerHTML.length > 0 ? "RENDERIZOU: " + root.innerHTML.slice(0,150) : "VAZIO");
  process.exit(0);
}, 2500);
