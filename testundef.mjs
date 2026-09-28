import { JSDOM } from 'jsdom';
import fs from 'fs';
const html = fs.readFileSync('/tmp/atual/dist/index.html','utf-8');
const js = fs.readFileSync('dist/assets/index-D54MolQv-1790426567807.js','utf-8');
const dom = new JSDOM(html,{runScripts:"outside-only",pretendToBeVisual:true,url:"https://comluxijewelry.pages.dev/"});
const {window}=dom;
const erros=[];
window.addEventListener('error',e=>erros.push('ERR: '+(e.error?.message||e.message)));
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
try{Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},configurable:true});}catch(e){}
window.fetch=()=>new Promise(()=>{});
window.scrollTo=()=>{};
new window.Function(js).call(window);
setTimeout(()=>{
  const root=window.document.getElementById('root');
  const txt=root?root.textContent:'';
  const ok=txt.includes('Entrar')||txt.includes('E-mail')||txt.includes('demonstração')||txt.includes('Recarregar');
  console.log(ok?"✅ NÃO TRAVOU (mostrou login ou fallback)":"❌ tela branca: "+txt.slice(0,40));
  erros.slice(0,3).forEach(e=>console.log(e));
  process.exit(0);
},9500);
