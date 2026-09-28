import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/atual/dist/index.html', 'utf-8');
const js = fs.readFileSync('dist/assets/index-CM9J9Y5M-1790163124264.js', 'utf-8');
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://comluxijewelry.pages.dev/" });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try { Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true }); } catch(e){}
window.fetch = () => new Promise(() => {}); // Supabase travado
window.scrollTo = () => {};
try { new window.Function(js).call(window); console.log("✅ executou"); } catch (e) { console.log("❌ crash:", e.message); }
setTimeout(() => {
  const root = window.document.getElementById('root');
  const txt = root ? root.textContent : '';
  const temLogin = txt.includes('Entrar') || txt.includes('E-mail') || txt.includes('demonstração');
  console.log(temLogin ? "✅ RECUPEROU → mostrou login (não travou)" : "❌ travado: " + txt.slice(0,50));
  process.exit(0);
}, 9500);
