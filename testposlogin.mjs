import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/atual/dist/index.html', 'utf-8');
const js = fs.readFileSync('dist/assets/index-CM9J9Y5M-1790163124264.js', 'utf-8');
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://comluxijewelry.pages.dev/" });
const { window } = dom;
const erros = [];
window.addEventListener('error', (e) => erros.push('ERRO: ' + (e.error?.message || e.message) + ' @ ' + (e.error?.stack||'').split('\n')[1]));
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try { Object.defineProperty(window, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true }); } catch(e){}

// SIMULAR SUPABASE RESPONDENDO como a conta cleberamjr (loja com 1 consultora, resto vazio)
window.fetch = async (url, opts) => {
  const u = String(url);
  // auth: usuario logado
  if (u.includes('/auth/v1/user')) return { ok:true, json: async () => ({ id:'user-1', email:'cleberamjr@gmail.com' }) };
  if (u.includes('/auth/v1/token')) return { ok:true, json: async () => ({ user:{id:'user-1',email:'cleberamjr@gmail.com'}, access_token:'x' }) };
  // lojas: retorna a Loja Teste
  if (u.includes('/rest/v1/lojas')) return { ok:true, json: async () => [{ id:'loja-1', nome:'Loja Teste', dona_id:'user-1', margem_padrao:100, formas_pagamento:['Dinheiro'] }] };
  if (u.includes('/rest/v1/assinaturas')) return { ok:true, json: async () => [{ loja_id:'loja-1', plano:'crescimento', status:'ativa', trial_ate:null }] };
  if (u.includes('/rest/v1/consultoras')) return { ok:true, json: async () => [{ id:'c1', loja_id:'loja-1', nome:'Você (dona)', comissao:0, eh_dona:true, ativa:true }] };
  // todas as outras tabelas: vazio
  if (u.includes('/rest/v1/')) return { ok:true, json: async () => [] };
  return { ok:true, json: async () => ({}) };
};
window.scrollTo = () => {};
try { new window.Function(js).call(window); console.log("✅ executou"); } catch (e) { console.log("❌ crash:", e.message); }

// esperar o boot + carregamento (splash é ~5s)
setTimeout(() => {
  const root = window.document.getElementById('root');
  const txt = root ? root.textContent : '';
  console.log("\n=== APÓS 7s (pós-login simulado) ===");
  console.log("root tem", root ? root.innerHTML.length : 0, "chars");
  console.log("conteúdo:", txt.slice(0,120).replace(/\s+/g,' '));
  console.log("\n=== ERROS ===");
  erros.slice(0,5).forEach(e => console.log(e));
  process.exit(0);
}, 7000);
