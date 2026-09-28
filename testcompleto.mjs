import { JSDOM } from 'jsdom';
import fs from 'fs';
const html=fs.readFileSync('/tmp/atual/dist/index.html','utf-8');
const js=fs.readFileSync('dist/assets/index-DlDkDyUO-1790427092072.js','utf-8');
const dom=new JSDOM(html,{runScripts:"outside-only",pretendToBeVisual:true,url:"https://comluxijewelry.pages.dev/"});
const {window}=dom;
const erros=[];
const oe=console.error; console.error=(...a)=>erros.push('CE: '+a.map(x=>String(x).slice(0,150)).join(' '));
window.addEventListener('error',e=>erros.push('ERR: '+(e.error?.message||e.message)));
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
try{Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},configurable:true});}catch(e){}
window.fetch=()=>new Promise(()=>{});
window.scrollTo=()=>{};
new window.Function(js).call(window);
setTimeout(()=>{
  console.error=oe;
  const root=window.document.getElementById('root');
  const txt=root?root.textContent:'';
  const login=txt.includes('Entrar')||txt.includes('E-mail')||txt.includes('demonstração');
  const erroTela=txt.includes('algo travou');
  console.log(login?"✅ MOSTROU LOGIN (funciona)":erroTela?"⚠️ Error boundary: "+erros.filter(e=>e.includes('not defined')).slice(0,1):"estado: "+txt.slice(0,50));
  const notDef=erros.filter(e=>e.includes('is not defined'));
  if(notDef.length){console.log("FUNÇÕES FALTANDO:");notDef.slice(0,5).forEach(e=>console.log(" "+e.slice(0,80)));}
  else console.log("✅ nenhuma função faltando");
  process.exit(0);
},9500);
