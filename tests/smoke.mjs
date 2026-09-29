// Bateria de testes do Luxi — roda o app PRONTO (dist/) num navegador simulado, com o
// Supabase simulado respondendo como responderia de verdade.
// Uso: node tests/smoke.mjs [pasta-do-build]   (sai com erro se QUALQUER teste falhar)
import { JSDOM } from 'jsdom';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.argv[2] || path.join(raiz, 'dist'));
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsNome = (html.match(/assets\/(index-[^"]+\.js)/) || [])[1];
const js = jsNome ? fs.readFileSync(path.join(dist, 'assets', jsNome), 'utf8') : '';

const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
const CHAVE_SESSAO = 'sb-eraxjtfedswksiyigasf-auth-token';
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const esperarPor = async (cond, ms = 14000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (cond()) return true; } catch (_) {} await pausa(100); }
  return false;
};

const usuario = (email = 'x@x.com', id = 'u1') => ({ id, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: '2026-09-06T00:00:00Z' });

function roteador(cfg) {
  return async (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url);
    const met = (init.method || 'GET').toUpperCase();
    cfg.log?.push(met + ' ' + url.replace(/^https:\/\/[^/]+/, ''));
    if (cfg.travar) return new Promise(() => {});
    for (const [rx, h] of cfg.rotas || []) if (rx.test(url)) return h(init, url);
    let m;
    if ((m = url.match(/\/rest\/v1\/rpc\/([a-z_]+)/))) {
      const v = cfg.rpc?.[m[1]];
      return json(typeof v === 'function' ? v(init) : v === undefined ? null : v);
    }
    if (url.includes('/auth/v1/token')) return cfg.token ? cfg.token(init) : json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
    if (url.includes('/auth/v1/user')) return cfg.usuario ? json(cfg.usuario) : json({ message: 'sem sessão' }, 401);
    if ((m = url.match(/\/rest\/v1\/([a-z_]+)/))) return json(cfg.tabelas?.[m[1]] ?? []);
    return json(null);
  };
}

async function abrir({ url = 'https://comluxijewelry.pages.dev/', sessao = null, cfg = {} }) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  if (sessao) {
    w.localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      access_token: 'a.b.c', refresh_token: 'r', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: sessao }));
    cfg.usuario = cfg.usuario || sessao;
  }
  const log = [];
  w.fetch = roteador({ ...cfg, log });
  const erros = [];
  w.addEventListener('error', (e) => erros.push(e.error?.message || e.message));
  new w.Function(js).call(w);
  const texto = () => w.document.body.textContent.replace(/\s+/g, ' ');
  const clicar = (rotulo, raizSel = 'body') => {
    const b = [...w.document.querySelectorAll(raizSel + ' button')].find((x) => x.textContent.replace(/\s+/g, ' ').includes(rotulo));
    if (!b) throw new Error('botão não encontrado: ' + rotulo);
    b.click();
  };
  const digitar = (el, valor) => {
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, valor);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  return { w, log, erros, texto, clicar, digitar, fechar: () => w.close() };
}

const resultados = [];
async function teste(nome, fn) {
  if (process.env.SO && !nome.startsWith(process.env.SO)) return;
  let ok = false, detalhe = '';
  try { const r = await fn(); ok = r.ok; detalhe = r.detalhe || ''; } catch (e) { detalhe = 'EXCEÇÃO: ' + e.message; }
  resultados.push(ok);
  console.log((ok ? '✅' : '❌'), nome, detalhe ? '— ' + detalhe : '');
}

// ---------- 0. o build em si ----------
await teste('0. build íntegro e sem segredos', async () => {
  const proibidos = ['Chelsead10', 'service_role', 'ghp_', 'sbp_', 'sk-proj'].filter((p) => js.includes(p));
  const ok = !!jsNome && js.length > 100000 && !html.includes('/src/') && js.includes('eraxjtfedswksiyigasf') && proibidos.length === 0;
  return { ok, detalhe: proibidos.length ? 'ENCONTRADO NO BUNDLE: ' + proibidos.join(', ') : `${jsNome} · ${(js.length / 1024) | 0} KB` };
});

await teste('0b. nenhuma variável/componente usado sem existir (o erro que travou o app em setembro)', async () => {
  const GLOBAIS = new Set(['window','document','navigator','localStorage','console','Math','Date','JSON','Array','Object','String','Number','Promise','setTimeout','clearTimeout','setInterval','clearInterval','Set','Map','Image','FileReader','URL','URLSearchParams','Intl','Boolean','parseInt','parseFloat','isNaN','Error','encodeURIComponent','decodeURIComponent','requestAnimationFrame','MutationObserver','fetch','crypto','Infinity','undefined','NaN','Symbol','Blob','File','FormData','atob','btoa','location','alert','confirm','caches','Event','CustomEvent']);
  const soltas = [];
  for (const arq of ['src/App.jsx', 'src/main.jsx', 'src/dados.js', 'src/contato.js']) {
    const ast = parse(fs.readFileSync(path.join(raiz, arq), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, { ReferencedIdentifier(p) { const n = p.node.name; if (!p.scope.hasBinding(n) && !GLOBAIS.has(n)) soltas.push(`${arq}:${p.node.loc.start.line} ${n}`); } });
  }
  return { ok: soltas.length === 0, detalhe: soltas.slice(0, 5).join(' ; ') };
});

// ---------- A. convite inválido ----------
await teste('A. link de convite inválido/usado: sem cadastro, só demonstração', async () => {
  const a = await abrir({ url: 'https://comluxijewelry.pages.dev/?beta=RUIM', cfg: { rpc: { validar_convite_beta: null } } });
  const ok = await esperarPor(() => a.texto().includes('não está mais válido'));
  const t = a.texto(); a.fechar();
  return { ok: ok && !t.includes('Criar conta e entrar') && t.includes('Ver a demonstração') && t.includes('Pedir um novo link no WhatsApp') };
});

// ---------- B. convite válido ----------
await teste('B. link de convite válido: e-mail fixo e texto de beta', async () => {
  const a = await abrir({ url: 'https://comluxijewelry.pages.dev/?beta=BOM', cfg: { rpc: { validar_convite_beta: { email: 'cliente@teste.com', dias: 30, ativo: true, usado: false } } } });
  const ok = await esperarPor(() => a.texto().includes('Seu acesso ao beta está liberado'));
  const campo = [...a.w.document.querySelectorAll('input')].find((i) => i.value === 'cliente@teste.com');
  const t = a.texto(); a.fechar();
  return { ok: ok && !!campo && campo.readOnly && !t.includes('maleta') };
});

// ---------- C. login ----------
await teste('C. sem convite: login, demonstração e rótulos ligados aos campos', async () => {
  const a = await abrir({});
  const ok = await esperarPor(() => a.texto().includes('Entrar') && a.texto().includes('demonstração'));
  await pausa(600);
  const rot = [...a.w.document.querySelectorAll('label')].find((l) => l.textContent.trim() === 'Senha');
  const ligado = !!rot?.htmlFor && a.w.document.getElementById(rot.htmlFor)?.tagName === 'INPUT';
  a.fechar();
  return { ok: ok && ligado, detalhe: ligado ? '' : 'rótulo "Senha" sem ligação com o campo' };
});

// ---------- D. internet travada ----------
await teste('D. internet travada com sessão salva: não fica preso na abertura', async () => {
  const a = await abrir({ sessao: usuario(), cfg: { travar: true } });
  const ok = await esperarPor(() => !a.texto().includes('Abrindo sua loja') && (a.texto().includes('Entrar') || a.texto().includes('demonstração')), 20000);
  a.fechar();
  return { ok };
});

// ---------- N. abrir o link leva ao login logo, sem ficar parado numa animação ----------
await teste('N. abrir o link do app: o login aparece em poucos segundos', async () => {
  const t0 = Date.now();
  const a = await abrir({});
  const chegou = await esperarPor(() => a.texto().includes('Entrar') && a.texto().includes('Senha'), 12000);
  const ms = Date.now() - t0; a.fechar();
  return { ok: chegou && ms <= 4200, detalhe: `login apareceu em ${(ms / 1000).toFixed(1)} s (limite 4,2 s)` };
});

// ---------- O. quem já criou a conta mas não terminou de abrir a loja volta direto para abrir a loja ----------
await teste('O. conta criada e loja ainda não aberta: ao voltar, vai direto para abrir a loja (não para o login)', async () => {
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString();
  const a = await abrir({ sessao: usuario('cliente@teste.com', 'c1'), cfg: { rpc: { sou_admin_luxi: false, meu_acesso_beta: { dias: 30, expira_em: em30 } } } });
  const foiParaLoja = await esperarPor(() => a.texto().includes('Começar meu beta'), 12000);
  const t = a.texto(); a.fechar();
  return { ok: foiParaLoja && !t.includes('Ainda não tenho conta'), detalhe: foiParaLoja ? '' : 'ficou na tela de login mesmo estando logada' };
});

// ---------- E + F. painel admin e troca de senha ----------
const USO = { resumo: { lojas: 3, usando_7d: 0, usando_30d: 2, pecas: 19, vendas_30d: 1, valor_vendas_30d: 100, romaneios_30d: 2, beta: 2, pagantes: 0 },
  lojas: [
    { id: 'l1', nome: 'Aguapé ', dona_email: 'vini@x.com', situacao: 'encerrado', plano: 'crescimento', pecas: 16, vendas_total: 0, vendas_30d: 0, romaneios_30d: 1, consultoras: 0, dias_restantes: null, ultima_atividade: '2026-09-14T00:42:58Z' },
    { id: 'l2', nome: 'Atelie Andressa', dona_email: 'and@x.com', situacao: 'beta', plano: 'crescimento', pecas: 3, vendas_total: 1, vendas_30d: 1, romaneios_30d: 1, consultoras: 1, dias_restantes: 30, ultima_atividade: '2026-09-12T05:23:00Z' },
    { id: 'l3', nome: 'Loja Teste', dona_email: 'cleberamjr@gmail.com', situacao: 'beta', plano: 'crescimento', pecas: 0, vendas_total: 0, vendas_30d: 0, romaneios_30d: 0, consultoras: 0, dias_restantes: 30, ultima_atividade: null } ] };
const admin = usuario('cleberamjr@gmail.com', 'e3b635f8');
await teste('E. painel admin mostra o USO real por loja (só os planos públicos)', async () => {
  const a = await abrir({ sessao: admin, cfg: { rpc: { sou_admin_luxi: true, uso_lojas_luxi: USO } } });
  if (!(await esperarPor(() => a.w.document.querySelector('.oj-hamb')))) return { ok: false, detalhe: 'app não abriu' };
  a.w.document.querySelector('.oj-hamb').click();
  await pausa(300);
  a.clicar('Uso do Luxi', 'nav');
  const carregou = await esperarPor(() => a.texto().includes('Atelie Andressa'));
  const t = a.texto(); a.fechar();
  const esperado = ['Aguapé', 'teste encerrado', 'ainda não usou', 'Ninguém paga ainda', '0 usando nesta semana', 'restam 30 dia', 'Trocar minha senha', 'Solo', 'Equipe'];
  const faltou = esperado.filter((x) => !t.includes(x));
  const indevido = ['179,90', '397,00'].filter((x) => t.includes(x));
  return { ok: carregou && !faltou.length && !indevido.length, detalhe: [faltou.length && 'faltou: ' + faltou.join(' | '), indevido.length && 'plano em espera aparecendo: ' + indevido.join(',')].filter(Boolean).join(' ; ') };
});

await teste('F. trocar senha: recusa senha atual errada e aceita a certa', async () => {
  const token = (init) => JSON.parse(init.body).password === 'senhaCerta'
    ? json({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, refresh_token: 'r2', user: admin })
    : json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
  const a = await abrir({ sessao: admin, cfg: { token, rpc: { sou_admin_luxi: true, uso_lojas_luxi: USO } } });
  await esperarPor(() => a.w.document.querySelector('.oj-hamb'));
  a.w.document.querySelector('.oj-hamb').click(); await pausa(300);
  a.clicar('Uso do Luxi', 'nav');
  await esperarPor(() => a.texto().includes('Trocar minha senha'));
  a.clicar('Trocar minha senha');
  await esperarPor(() => a.w.document.querySelectorAll('input[type=password]').length === 3);
  const [atual, nova, nova2] = a.w.document.querySelectorAll('input[type=password]');
  a.digitar(atual, 'errada'); a.digitar(nova, 'novaSenha1'); a.digitar(nova2, 'novaSenha1');
  a.clicar('Salvar nova senha');
  const recusou = await esperarPor(() => a.texto().includes('A senha atual não confere'));
  a.digitar(a.w.document.querySelectorAll('input[type=password]')[0], 'senhaCerta');
  a.clicar('Salvar nova senha');
  const aceitou = await esperarPor(() => a.texto().includes('Senha trocada!'));
  const chamouTroca = a.log.some((l) => l.startsWith('PUT /auth/v1/user'));
  a.fechar();
  return { ok: recusou && aceitou && chamouTroca, detalhe: `recusou errada=${recusou}; aceitou certa=${aceitou}; enviou ao servidor=${chamouTroca}` };
});

// ---------- G. nova versão não recarrega sozinha ----------
await teste('G. versão nova: avisa com faixa "Atualizar", sem recarregar sozinho', async () => {
  const a = await abrir({});
  await esperarPor(() => a.texto().includes('Entrar'));
  a.w.dispatchEvent(new a.w.Event('luxi:nova-versao'));
  const faixa = a.w.document.getElementById('luxi-nova-versao');
  const tem = !!faixa && faixa.textContent.includes('Tem uma versão nova') && !!a.w.document.getElementById('luxi-atualizar');
  [...faixa.querySelectorAll('button')].find((b) => b.textContent === 'Depois').click();
  const some = !a.w.document.getElementById('luxi-nova-versao');
  a.fechar();
  return { ok: tem && some };
});

// ---------- H. assistente do beta ----------
await teste('H. cliente beta vê os dias reais e nenhum plano em espera', async () => {
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString();
  const a = await abrir({ url: 'https://comluxijewelry.pages.dev/?beta=TOK', sessao: usuario('cliente@teste.com', 'c1'),
    cfg: { rpc: { sou_admin_luxi: false, consumir_convite_beta: true, meu_acesso_beta: { dias: 30, expira_em: em30 } } } });
  const ok = await esperarPor(() => a.texto().includes('Começar meu beta'));
  const t = a.texto(); a.fechar();
  const indevido = ['Testar 72h', '179,90', '397,00'].filter((x) => t.includes(x));
  return { ok: ok && t.includes('30 dias') && !indevido.length, detalhe: indevido.length ? 'apareceu: ' + indevido.join(', ') : '' };
});

async function carregarDados() {
  const saida = path.join(os.tmpdir(), 'dados-teste-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.mjs');
  const r = await build({ entryPoints: [path.join(raiz, 'src/dados.js')], bundle: true, format: 'esm', platform: 'node', write: false,
    define: { 'import.meta.env.VITE_SUPABASE_URL': '"https://eraxjtfedswksiyigasf.supabase.co"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"sb_publishable_teste"' } });
  fs.writeFileSync(saida, r.outputFiles[0].text);
  const mod = await import(pathToFileURL(saida).href);
  fs.unlinkSync(saida);
  return mod;
}

// ---------- I. fotos ----------
await teste('I. fotos vão para o armazenamento; se falhar, a foto não se perde', async () => {
  const dadosMod = await carregarDados();
  const fetchReal = globalThis.fetch;
  const foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/';
  const rodar = async (statusUpload) => {
    let corpo = null;
    globalThis.fetch = async (u, init = {}) => {
      const url = String(u);
      if (url.startsWith('data:')) return fetchReal(u, init);
      if (url.includes('/storage/v1/object/fotos-pecas/')) return statusUpload === 200 ? json({ Key: 'fotos-pecas/x' }) : json({ message: 'falhou' }, statusUpload);
      if (url.includes('/rest/v1/pecas')) { corpo = JSON.parse(init.body); return new Response(null, { status: 201 }); }
      return json(null);
    };
    await dadosMod.pecas.criar('loja-1', { codigo: 'AN-1', nome: 'Anel', qtd: 1, custo: 10, venda: 30, fotos: [foto] });
    return corpo?.fotos?.[0] || '';
  };
  const comSucesso = await rodar(200);
  const comFalha = await rodar(500);
  globalThis.fetch = fetchReal;
  const urlOk = comSucesso.startsWith('https://eraxjtfedswksiyigasf.supabase.co/storage/v1/object/public/fotos-pecas/loja-1/') && comSucesso.endsWith('.jpg');
  const preservou = comFalha === foto;
  return { ok: urlOk && preservou, detalhe: `envio ok→endereço da foto=${urlOk}; envio falhou→foto preservada=${preservou}` };
});

// ---------- J. cadastro pelo link: sem pedir confirmação de e-mail ----------
const linkBeta = (extra = {}) => ({
  url: 'https://comluxijewelry.pages.dev/?beta=' + 'T'.repeat(32),
  cfg: { usuario: usuario('cliente@teste.com', 'c1'),
    rpc: { sou_admin_luxi: false, validar_convite_beta: { email: 'cliente@teste.com', dias: 30, ativo: true, usado: false },
      consumir_convite_beta: true, meu_acesso_beta: { dias: 30, expira_em: new Date(Date.now() + 30 * 864e5).toISOString() } },
    ...extra } });
const preencherECriar = async (a) => {
  await esperarPor(() => a.texto().includes('Seu acesso ao beta está liberado'));
  const [s1, s2] = a.w.document.querySelectorAll('input[type=password]');
  a.digitar(s1, 'minhaSenha1'); a.digitar(s2, 'minhaSenha1'); await pausa(200);
  a.clicar('Criar conta e entrar');
};
const tokenOk = (init) => JSON.parse(init.body).password === 'minhaSenha1'
  ? json({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, refresh_token: 'r', user: usuario('cliente@teste.com', 'c1') })
  : json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);

const FN = /functions\/v1\/criar-conta-beta/;
const EMAIL_PEDIDO = /Confirme seu e-mail|Já confirmei|link de confirma/;

await teste('J. cliente nova pelo link: conta criada já confirmada, entra direto, sem pedir e-mail', async () => {
  const { url, cfg } = linkBeta(); cfg.token = tokenOk;
  cfg.rotas = [[FN, () => json({ ok: true, criada: true, email: 'cliente@teste.com' })]];
  const a = await abrir({ url, cfg });
  await preencherECriar(a);
  const chegou = await esperarPor(() => a.texto().includes('Começar meu beta'));
  const t = a.texto();
  const chamou = { funcao: a.log.some((l) => FN.test(l)), login: a.log.some((l) => l.includes('grant_type=password')), signupDireto: a.log.some((l) => l.includes('/auth/v1/signup')), consumiu: a.log.some((l) => l.includes('consumir_convite_beta')) };
  a.fechar();
  return { ok: chegou && !EMAIL_PEDIDO.test(t) && chamou.funcao && chamou.login && !chamou.signupDireto && chamou.consumiu, detalhe: `chegou ao assistente=${chegou}; pediu e-mail=${EMAIL_PEDIDO.test(t)}; ${JSON.stringify(chamou)}` };
});

await teste('J2. link de e-mail que JÁ tem conta: explica em vez de fingir que mandou e-mail', async () => {
  const { url, cfg } = linkBeta(); cfg.token = () => json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400);
  cfg.rotas = [[FN, () => json({ ok: true, existe: true, email: 'cliente@teste.com' })]];
  const a = await abrir({ url, cfg });
  await preencherECriar(a);
  const explicou = await esperarPor(() => a.texto().includes('já tem uma conta no Luxi'));
  const t = a.texto(); a.fechar();
  const foiParaEntrar = !t.includes('Criar conta e entrar');
  return { ok: explicou && !EMAIL_PEDIDO.test(t) && foiParaEntrar, detalhe: `levada ao modo Entrar=${foiParaEntrar}` };
});

await teste('J3. função fora do ar: cai no caminho direto e ainda assim entra sem confirmar', async () => {
  const { url, cfg } = linkBeta(); cfg.token = tokenOk;
  cfg.rotas = [[FN, () => json({ message: 'indisponível' }, 503)], [/\/auth\/v1\/signup/, () => json(usuario('cliente@teste.com', 'c1'))]];
  const a = await abrir({ url, cfg });
  await preencherECriar(a);
  const chegou = await esperarPor(() => a.texto().includes('Começar meu beta'));
  const usouSignup = a.log.some((l) => l.includes('/auth/v1/signup'));
  const t = a.texto(); a.fechar();
  return { ok: chegou && usouSignup && !EMAIL_PEDIDO.test(t), detalhe: `caminho direto usado=${usouSignup}` };
});

// ---------- L. cadastro direto também não fica esperando confirmação ----------
await teste('L. cadastro direto (sem link): entra sozinho depois de criar a conta', async () => {
  const dadosMod = await carregarDados(); const fetchReal = globalThis.fetch; const chamadas = [];
  globalThis.fetch = async (u, init = {}) => {
    const url = String(u); chamadas.push(url.replace(/^https:\/\/[^/]+/, ''));
    if (url.includes('email_liberado_beta')) return json(true);
    if (url.includes('/auth/v1/signup')) return json(usuario('a@b.com', 'x1'));            // sem sessão: como o Supabase responde com confirmação ligada
    if (url.includes('grant_type=password')) return json({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, refresh_token: 'r', user: usuario('a@b.com', 'x1') });
    return json(null);
  };
  const u = await dadosMod.auth.cadastrar('a@b.com', 'senha123');
  globalThis.fetch = fetchReal;
  return { ok: u?.email === 'a@b.com' && chamadas.some((c) => c.includes('grant_type=password')), detalhe: `entrou automaticamente=${chamadas.some((c) => c.includes('grant_type=password'))}` };
});

// ---------- M. fornecedor ao incluir produto ----------
await teste('M. incluir produto: escolher o fornecedor e ele ser gravado', async () => {
  const futuro = new Date(Date.now() + 5 * 864e5).toISOString();
  let gravado = null;
  const cfg = { rpc: { sou_admin_luxi: false }, tabelas: {
    lojas: [{ id: 'L1', nome: 'Loja X', dona_id: 'u1', margem_padrao: 100, formas_pagamento: ['Dinheiro'], fornecedores_json: [{ nome: 'Prata Fina', margem: 120 }, { nome: 'Del Rey', margem: 150 }] }],
    assinaturas: [{ loja_id: 'L1', plano: 'crescimento', status: 'trial', trial_ate: futuro }],
    consultoras: [{ id: 'c1', loja_id: 'L1', nome: 'Dona', eh_dona: true, ativa: true, comissao: 0 }] } };
  const a = await abrir({ sessao: usuario('dona@x.com', 'u1'), cfg });
  const orig = a.w.fetch;
  a.w.fetch = async (u, i = {}) => { if (String(u).includes('/rest/v1/pecas') && (i.method || 'GET') === 'POST') { gravado = JSON.parse(i.body); return new Response(null, { status: 201 }); } return orig(u, i); };
  if (!(await esperarPor(() => a.w.document.querySelector('.oj-atalho')))) return { ok: false, detalhe: 'app não abriu' };
  a.clicar('Peças', '.oj-atalhos');
  await esperarPor(() => [...a.w.document.querySelectorAll('button')].some((b) => b.textContent.includes('Cadastrar produto')));
  a.clicar('+ Cadastrar produto');
  await esperarPor(() => a.texto().includes('Quem te vendeu esta peça'));
  const chips = [...a.w.document.querySelectorAll('.oj-modal .oj-chip')].map((c) => c.textContent.trim());
  const nome = [...a.w.document.querySelectorAll('.oj-modal .oj-campo')].find((c) => c.querySelector('label')?.textContent === 'Nome').querySelector('input');
  a.digitar(nome, 'Anel teste'); await pausa(200);
  a.clicar('Del Rey', '.oj-modal'); await pausa(200);
  if (process.env.DEBUG) { await pausa(300); console.log('   [debug] chips:', [...a.w.document.querySelectorAll('.oj-modal .oj-chip')].map((c) => c.textContent.trim() + '=' + c.dataset.on).join(' | ')); }
  a.clicar('Incluir no estoque');
  await esperarPor(() => gravado, 6000);
  if (process.env.DEBUG) console.log('   [debug] corpo gravado:', JSON.stringify(gravado), '| erros da tela:', a.texto().match(/(Dê ao menos[^.]*\.|Não consegui[^.]*\.)/)?.[0]);
  a.fechar();
  const temChips = chips.includes('Prata Fina') && chips.includes('Del Rey') && chips.includes('+ Outro');
  return { ok: temChips && gravado?.fornecedor === 'Del Rey', detalhe: `opções=${chips.filter((c) => /Prata|Rey|Outro/.test(c)).join(',')}; gravado=${gravado?.fornecedor}` };
});

// ---------- P. administradora redefine a senha de uma cliente ----------
await teste('P. admin gera senha temporária: aparece uma vez, com o token dela, e vai para o histórico', async () => {
  let visto = null;
  const cfg = { rpc: { sou_admin_luxi: true, uso_lojas_luxi: USO, auditoria_admin_recente: [{ quando: new Date().toISOString(), acao: 'redefinir_senha', alvo: 'antiga@x.com' }] },
    rotas: [[/functions\/v1\/admin-redefinir-senha/, (init) => { visto = { auth: new Headers(init.headers).get('authorization'), corpo: JSON.parse(init.body) }; return json({ ok: true, email: 'vini@x.com', senha: 'Kx7mQp9rTw', gerada: true, registrado: true }); }]] };
  const a = await abrir({ sessao: admin, cfg });
  a.w.confirm = () => true; // o jsdom não tem janela de confirmação
  await esperarPor(() => a.w.document.querySelector('.oj-hamb'));
  a.w.document.querySelector('.oj-hamb').click(); await pausa(300);
  a.clicar('Uso do Luxi', 'nav');
  if (!(await esperarPor(() => a.texto().includes('Ajudar uma cliente a entrar')))) return { ok: false, detalhe: 'cartão não apareceu' };
  const campo = a.w.document.querySelector('input[aria-label="E-mail da cliente"]');
  a.digitar(campo, 'vini@x.com'); await pausa(200);
  a.clicar('Gerar senha temporária');
  const mostrou = await esperarPor(() => a.texto().includes('Kx7mQp9rTw'));
  const t = a.texto(); a.fechar();
  const ok = mostrou && visto?.corpo?.email === 'vini@x.com' && visto.corpo.senha === undefined && visto.auth === 'Bearer a.b.c' && t.includes('Copiar mensagem') && t.includes('Enviar pelo WhatsApp') && t.includes('antiga@x.com');
  return { ok, detalhe: `mostrou=${mostrou}; enviou o token da administradora=${visto?.auth === 'Bearer a.b.c'}; pediu geração automática=${visto?.corpo?.senha === undefined}; histórico=${t.includes('antiga@x.com')}` };
});

await teste('P2. cada loja da lista tem "Redefinir senha dela", que preenche o e-mail', async () => {
  const a = await abrir({ sessao: admin, cfg: { rpc: { sou_admin_luxi: true, uso_lojas_luxi: USO, auditoria_admin_recente: [] } } });
  a.w.HTMLElement.prototype.scrollIntoView = () => {};
  await esperarPor(() => a.w.document.querySelector('.oj-hamb'));
  a.w.document.querySelector('.oj-hamb').click(); await pausa(300);
  a.clicar('Uso do Luxi', 'nav');
  await esperarPor(() => a.texto().includes('Redefinir senha dela'));
  a.clicar('Redefinir senha dela'); await pausa(300);
  const campo = a.w.document.querySelector('input[aria-label="E-mail da cliente"]');
  const valor = campo?.value; a.fechar();
  return { ok: valor === 'vini@x.com', detalhe: `e-mail preenchido="${valor}"` };
});

// ---------- Q. cliente com senha temporária é obrigada a criar a dela ----------
await teste('Q. senha temporária: a cliente só usa o app depois de criar a senha nova', async () => {
  const futuro = new Date(Date.now() + 5 * 864e5).toISOString();
  const cfg = { rpc: { sou_admin_luxi: false, preciso_trocar_senha: true, concluir_troca_senha: null }, tabelas: {
    lojas: [{ id: 'L1', nome: 'Loja X', dona_id: 'u1', margem_padrao: 100, formas_pagamento: ['Dinheiro'], fornecedores_json: [] }],
    assinaturas: [{ loja_id: 'L1', plano: 'crescimento', status: 'trial', trial_ate: futuro }],
    consultoras: [{ id: 'c1', loja_id: 'L1', nome: 'Dona', eh_dona: true, ativa: true, comissao: 0 }] } };
  const a = await abrir({ sessao: usuario('dona@x.com', 'u1'), cfg });
  if (!(await esperarPor(() => a.texto().includes('Crie a sua nova senha')))) return { ok: false, detalhe: 'a tela obrigatória não apareceu' };
  const semApp = !a.w.document.querySelector('.oj-atalho');
  const [n1, n2] = a.w.document.querySelectorAll('input[type=password]');
  a.digitar(n1, 'NovaSenha99'); a.digitar(n2, 'OutraCoisa88'); await pausa(200);
  a.clicar('Salvar e continuar');
  const barrou = await esperarPor(() => a.texto().includes('não são iguais'));
  a.digitar(a.w.document.querySelectorAll('input[type=password]')[1], 'NovaSenha99'); await pausa(200);
  a.clicar('Salvar e continuar');
  const liberou = await esperarPor(() => !a.texto().includes('Crie a sua nova senha') && a.w.document.querySelector('.oj-atalho'));
  const trocou = a.log.some((l) => l.startsWith('PUT /auth/v1/user')), concluiu = a.log.some((l) => l.includes('concluir_troca_senha'));
  a.fechar();
  return { ok: semApp && barrou && liberou && trocou && concluiu, detalhe: `app bloqueado antes=${semApp}; recusou senhas diferentes=${barrou}; liberou depois=${!!liberou}; salvou no servidor=${trocou}; limpou a marca=${concluiu}` };
});

await teste('Q2. cliente comum (sem redefinição) entra no app normalmente', async () => {
  const futuro = new Date(Date.now() + 5 * 864e5).toISOString();
  const cfg = { rpc: { sou_admin_luxi: false, preciso_trocar_senha: false }, tabelas: {
    lojas: [{ id: 'L1', nome: 'Loja X', dona_id: 'u1', margem_padrao: 100, formas_pagamento: ['Dinheiro'], fornecedores_json: [] }],
    assinaturas: [{ loja_id: 'L1', plano: 'crescimento', status: 'trial', trial_ate: futuro }],
    consultoras: [{ id: 'c1', loja_id: 'L1', nome: 'Dona', eh_dona: true, ativa: true, comissao: 0 }] } };
  const a = await abrir({ sessao: usuario('dona@x.com', 'u1'), cfg });
  const entrou = await esperarPor(() => a.w.document.querySelector('.oj-atalho'));
  await pausa(500); const t = a.texto(); a.fechar();
  return { ok: !!entrou && !t.includes('Crie a sua nova senha') };
});

// ---------- P. suporte: a administradora abre a loja de uma cliente ----------
const em10 = new Date(Date.now() + 10 * 864e5).toISOString(), ontem = new Date(Date.now() - 864e5).toISOString();
const LOJA_SUPORTE = {
  loja: { id: 'l2', nome: 'Atelie Andressa', whatsapp: '5511999990001' },
  dona: { email: 'and@x.com', ultimo_login: ontem, conta_criada: '2026-09-12T00:00:00Z' },
  assinatura: { plano: 'crescimento', status: 'trial', trial_ate: em10 },
  resumo: { pecas: 2, unidades: 5, vendas_total: 2, vendas_30d: 2, valor_30d: 11800, a_receber: 4900, clientes: 1, consultoras: 1, romaneios: 1, ultima_atividade: ontem },
  atividade: [
    { quando: ontem, tipo: 'venda', nome: 'Anel solitário', codigo: 'AN-1', qtd: 1, valor: 6900, extra: 'Maria' },
    { quando: ontem, tipo: 'peca', nome: 'Brinco argola', codigo: 'BR-2', qtd: 2, valor: 4900, extra: 'Del Rey' },
    { quando: ontem, tipo: 'romaneio', nome: null, codigo: null, qtd: 12, valor: 90000, extra: 'Prata Fina' },
    { quando: ontem, tipo: 'despesa', nome: 'Embalagens', codigo: null, qtd: null, valor: 5000, extra: 'variavel' } ],
  dias: Array.from({ length: 30 }, (_, i) => ({ dia: '2026-09-' + String(i + 1).padStart(2, '0'), n: i % 7 === 0 ? 3 : 0 })),
  pecas: [{ id: 'p1', codigo: 'AN-1', nome: 'Anel solitário', qtd: 3, custo_centavos: 2500, venda_centavos: 6900, banho: 'Ouro 18k', fornecedor: 'Prata Fina', tem_foto: true, capa: 'https://eraxjtfedswksiyigasf.supabase.co/storage/v1/object/public/fotos-pecas/l2/1.jpg' }],
  vendas: [{ id: 'v1', nome: 'Brinco argola', codigo: 'BR-2', qtd: 1, valor_centavos: 4900, vendida_em: ontem, modalidade: 'Fiado', cliente: 'Joana', pago: false }],
  clientes: [{ id: 'c1', nome: 'Maria', telefone: '11988887777', cpf: '12345678900', endereco: 'Rua A, 10' }],
  despesas: [{ id: 'd1', nome: 'Embalagens', tipo: 'variavel', competencia: '2026-09-25', valor_centavos: 5000 }],
  consultoras: [{ id: 'k1', nome: 'Bia', eh_dona: false, ativa: true, comissao: 20, usuario_id: null }],
  entradas: [{ id: 'e1', fornecedor: 'Prata Fina', criada_em: ontem, qtd_itens: 12, total_centavos: 90000 }] };
const abrirPainelAdmin = async (cfgExtra = {}) => {
  const a = await abrir({ sessao: admin, cfg: { rpc: { sou_admin_luxi: true, uso_lojas_luxi: USO, admin_ver_loja: LOJA_SUPORTE }, ...cfgExtra } });
  await esperarPor(() => a.w.document.querySelector('.oj-hamb'));
  a.w.document.querySelector('.oj-hamb').click(); await pausa(300);
  a.clicar('Uso do Luxi', 'nav');
  await esperarPor(() => a.texto().includes('Atelie Andressa'));
  return a;
};

await teste('S. suporte: clica na loja e vê os dados e a atividade (somente leitura, 1 registro)', async () => {
  const a = await abrirPainelAdmin();
  a.w.document.querySelector('button[aria-label*="Atelie Andressa"]').click();
  const abriu = await esperarPor(() => a.texto().includes('Modo suporte'));
  await pausa(200);
  const t1 = a.texto();
  const esperado1 = ['somente leitura', 'fica registrado', 'Atelie Andressa', 'and@x.com', 'restam 10 dia', 'Vendeu Anel solitário (1 un) por R$ 69,00 para Maria', 'Cadastrou a peça BR-2 — Brinco argola (2 un) · fornecedor Del Rey', 'Importou um romaneio de Prata Fina · 12 itens', 'Lançou a despesa Embalagens', 'R$ 49,00'];
  a.clicar('Vendas', '[aria-label="Seções da loja"]'); await pausa(150);
  const tVendas = a.texto();
  a.clicar('Clientes', '[aria-label="Seções da loja"]'); await pausa(150);
  const tCli = a.texto();
  a.clicar('Equipe', '[aria-label="Seções da loja"]'); await pausa(150);
  const tEq = a.texto();
  const faltou = esperado1.filter((x) => !t1.includes(x));
  const gravou = a.log.filter((l) => /^(POST|PATCH|DELETE|PUT) \/rest\/v1\/(?!rpc\/)/.test(l));
  const aberturas = a.log.filter((l) => l.includes('admin_ver_loja')).length;
  a.fechar();
  return { ok: abriu && !faltou.length && tVendas.includes('a receber') && tCli.includes('11988887777') && tEq.includes('convite pendente') && !gravou.length && aberturas === 1 && !/SEGREDO|convite_codigo/.test(tEq),
    detalhe: [faltou.length && 'faltou: ' + faltou.join(' | '), gravou.length && 'GRAVOU NO BANCO: ' + gravou.join(','), `aberturas registradas=${aberturas}`].filter(Boolean).join(' ; ') };
});

await teste('S2. suporte: se o SQL ainda não foi rodado, explica e deixa voltar', async () => {
  const a = await abrirPainelAdmin({ rotas: [[/rpc\/admin_ver_loja/, () => json({ code: 'PGRST202', message: 'Could not find the function public.admin_ver_loja(p_loja) in the schema cache' }, 404)]] });
  a.w.document.querySelector('button[aria-label*="Atelie Andressa"]').click();
  const explicou = await esperarPor(() => a.texto().includes('ainda não foi ativada'));
  a.clicar('Voltar às lojas');
  const voltou = await esperarPor(() => a.texto().includes('Lojas e uso'));
  a.fechar();
  return { ok: explicou && voltou, detalhe: `explicou=${explicou}; voltou à lista=${voltou}` };
});

const todos = resultados.every(Boolean);
console.log(todos ? `\nTODOS OS ${resultados.length} TESTES PASSARAM` : `\n${resultados.filter((x) => !x).length} TESTE(S) FALHARAM — NÃO PUBLIQUE`);
process.exit(todos ? 0 : 1);
