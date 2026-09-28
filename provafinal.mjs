import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/prova/index.html', 'utf-8');
const js = fs.readFileSync('/tmp/prova/assets/index-BhSdtNmU-1789797723159.js', 'utf-8');
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://comluxijewelry.pages.dev/" });
const { window } = dom;
const erros = [];
window.addEventListener('error', (e) => erros.push('ERRO: ' + (e.error?.message || e.message)));
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try { Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true }); } catch(e){}
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}), ok: true });
window.scrollTo = () => {};
try {
  const script = new window.Function(js);
  script.call(window);
  console.log("✅ EXECUTOU SEM CRASH");
} catch (e) {
  console.log("❌ CRASH:", e.message);
  console.log((e.stack||'').split('\n').slice(0,4).join('\n'));
}
setTimeout(() => {
  const root = window.document.getElementById('root');
  if (root && root.innerHTML.length > 500) {
    console.log("✅ APP RENDERIZOU —", root.innerHTML.length, "caracteres");
    console.log("   Primeiros elementos:", root.innerHTML.slice(0,80).replace(/\n/g,' '));
  } else {
    console.log("❌ APP NÃO RENDERIZOU — #root vazio ou quase");
  }
  if (erros.length) { console.log("\nERROS:"); erros.slice(0,3).forEach(e => console.log("  " + e)); }
  process.exit(0);
}, 3000);
