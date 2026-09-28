import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/atual/dist/index.html', 'utf-8');
const js = fs.readFileSync('dist/assets/index-CM9J9Y5M-1790163124264.js', 'utf-8');
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://comluxijewelry.pages.dev/" });
const { window } = dom;
const erros = [];
// capturar console.error do React (onde erros de render aparecem)
const origErr = console.error;
console.error = (...args) => { erros.push('CONSOLE.ERROR: ' + args.map(a=>String(a).slice(0,200)).join(' ')); };
window.addEventListener('error', (e) => erros.push('WIN.ERR: ' + (e.error?.message||e.message)));
window.addEventListener('unhandledrejection', (e) => erros.push('PROMISE.REJECT: ' + (e.reason?.message||e.reason)));
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
try { Object.defineProperty(window, 'localStorage', { value: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }, configurable:true }); } catch(e){}
window.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/auth/v1/user')) return { ok:true, json: async()=>({id:'user-1',email:'cleberamjr@gmail.com'}) };
  if (u.includes('/rest/v1/lojas')) return { ok:true, json: async()=>[{id:'loja-1',nome:'Loja Teste',dona_id:'user-1',margem_padrao:100,formas_pagamento:['Dinheiro']}] };
  if (u.includes('/rest/v1/assinaturas')) return { ok:true, json: async()=>[{loja_id:'loja-1',plano:'crescimento',status:'ativa'}] };
  if (u.includes('/rest/v1/consultoras')) return { ok:true, json: async()=>[{id:'c1',loja_id:'loja-1',nome:'Dona',comissao:0,eh_dona:true,ativa:true}] };
  if (u.includes('/rest/v1/')) return { ok:true, json: async()=>[] };
  return { ok:true, json: async()=>({}) };
};
window.scrollTo = () => {};
new window.Function(js).call(window);
setTimeout(() => {
  console.error = origErr;
  const root = window.document.getElementById('root');
  const txt = root ? root.textContent : '';
  const temPainel = txt.includes('Seu mês') || txt.includes('vendas') || txt.includes('lucro') || txt.includes('Loja Teste');
  const temSplash = txt.includes('Gestão Leve') && txt.length < 5000;
  console.log("temPainel:", temPainel, "| chars:", root?root.innerHTML.length:0);
  console.log("primeiros 200:", txt.slice(0,200).replace(/\s+/g,' '));
  console.log("=== ERROS (" + erros.length + ") ===");
  erros.slice(0,8).forEach(e => console.log(e.slice(0,250)));
  process.exit(0);
}, 8000);
