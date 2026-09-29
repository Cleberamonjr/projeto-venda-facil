import { JSDOM } from 'jsdom';
import fs from 'fs';
const dist = '/tmp/live';
const html = fs.readFileSync(dist + '/index.html', 'utf8');
const jsFile = fs.readdirSync(dist + '/assets').find(f => f.endsWith('.js'));
const js = fs.readFileSync(dist + '/assets/' + jsFile, 'utf8');

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function cenario(nome, { url, rpc = {}, travar = false, sessao = false, espera = 7000, checar }) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window;
  const chamadas = [];
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  if (sessao) {
    // sessão salva no aparelho: obriga o app a consultar o servidor no boot
    w.localStorage.setItem('sb-eraxjtfedswksiyigasf-auth-token', JSON.stringify({
      access_token: 'a.b.c', refresh_token: 'r', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
      user: { id: 'u1', email: 'x@x.com', aud: 'authenticated' } }));
  }
  w.fetch = (u, o) => {
    const alvo = String(u); chamadas.push(alvo.replace(/^https:\/\/[^/]+/, ''));
    if (travar) return new Promise(() => {});           // servidor que nunca responde
    const m = alvo.match(/\/rest\/v1\/rpc\/([a-z_]+)/);
    if (m && m[1] in rpc) return Promise.resolve(json(rpc[m[1]]));
    return Promise.resolve(json(null));
  };
  const erros = [];
  w.addEventListener('error', e => erros.push(e.error?.message || e.message));
  new w.Function(js).call(w);
  await new Promise(r => setTimeout(r, espera));
  const texto = w.document.body.textContent.replace(/\s+/g, ' ');
  const r = checar(w, texto);
  const ok = r.ok && !erros.some(e => /not defined|Cannot read/.test(e));
  console.log((ok ? '✅' : '❌'), nome, r.detalhe ? '— ' + r.detalhe : '', erros.length ? '| ERROS: ' + erros.slice(0, 2).join(' / ') : '');
  w.close();
  return ok;
}

const resultados = [];
resultados.push(await cenario('A. link de convite INVÁLIDO/usado', {
  url: 'https://comluxijewelry.pages.dev/?beta=TOKEN_RUIM', rpc: { validar_convite_beta: null },
  checar: (w, t) => ({ ok: t.includes('não está mais válido') && !t.includes('Criar conta e entrar') && t.includes('Ver a demonstração'),
    detalhe: t.includes('Criar conta') ? 'MOSTROU formulário de cadastro' : 'sem formulário; oferece demonstração' }) }));

resultados.push(await cenario('B. link de convite VÁLIDO', {
  url: 'https://comluxijewelry.pages.dev/?beta=TOKEN_BOM',
  rpc: { validar_convite_beta: { email: 'cliente@teste.com', dias: 30, expira_em: '2026-10-28T00:00:00Z', ativo: true, usado: false } },
  checar: (w, t) => { const inp = [...w.document.querySelectorAll('input')].find(i => i.value === 'cliente@teste.com');
    return { ok: t.includes('Seu acesso ao beta está liberado') && !!inp && inp.readOnly && !t.includes('maleta'),
      detalhe: `e-mail fixo=${!!inp && inp.readOnly}; texto de consultora=${t.includes('maleta')}` }; } }));

resultados.push(await cenario('C. sem convite: login + rótulos ligados aos campos', {
  url: 'https://comluxijewelry.pages.dev/',
  checar: (w, t) => { const rot = [...w.document.querySelectorAll('label')].find(l => l.textContent.trim() === 'Senha');
    const ligado = !!rot && !!rot.htmlFor && w.document.getElementById(rot.htmlFor)?.tagName === 'INPUT';
    return { ok: t.includes('Entrar') && t.includes('demonstração') && ligado, detalhe: `rótulo "Senha" ligado ao campo=${ligado}` }; } }));

resultados.push(await cenario('D. internet TRAVADA com sessão salva (não pode ficar preso)', {
  url: 'https://comluxijewelry.pages.dev/', travar: true, sessao: true, espera: 13000,
  checar: (w, t) => ({ ok: !t.includes('Abrindo sua loja') && (t.includes('Entrar') || t.includes('demonstração')),
    detalhe: t.includes('Abrindo sua loja') ? 'PRESO na abertura' : 'liberou a tela após o limite de tempo' }) }));

console.log(resultados.every(Boolean) ? '\nTODOS OS CENÁRIOS PASSARAM' : '\nHÁ FALHAS');
process.exit(resultados.every(Boolean) ? 0 : 1);
