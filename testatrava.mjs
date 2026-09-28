import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/atual/dist/index.html', 'utf-8');
const js = fs.readFileSync('dist/assets/index-BW3s9n_d-1789836770376.js', 'utf-8');
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://comluxijewelry.pages.dev/" });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try { Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true }); } catch(e){}
// SIMULAR SUPABASE QUE TRAVA — fetch que nunca resolve
window.fetch = () => new Promise(() => {});
window.scrollTo = () => {};
try {
  new window.Function(js).call(window);
  console.log("✅ executou");
} catch (e) { console.log("❌ crash:", e.message); }
// checar em 9 segundos (a rede de seguranca é 8s)
setTimeout(() => {
  const root = window.document.getElementById('root');
  const txt = root ? root.textContent : '';
  const temLogin = txt.includes('Entrar') || txt.includes('E-mail') || txt.includes('demonstração');
  console.log(temLogin ? "✅ SAIU DA SPLASH → mostrou login (rede de segurança funcionou)" : "❌ AINDA TRAVADO na splash: " + txt.slice(0,60));
  process.exit(0);
}, 9500);
