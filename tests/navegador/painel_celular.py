"""Auditoria do painel da administradora em CELULAR, em navegador real.
Matriz: 4 larguras de celular x 2 temas x todas as telas (seções, loja observada, janelas de exclusão).
Mede por código (não "a olho"): nada passa da borda, texto não é espremido, toque >= 44 px, contraste >= 4,5:1,
campos com 16 px (evita o zoom do iPhone) e os botões da janela de exclusão sempre à vista.
Nasceu de um defeito real: "Contas sem loja" e "Acessos beta" saíram quebrados no iPhone porque esta combinação nunca foi desenhada nos testes."""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
import suporte
from playwright.sync_api import sync_playwright

AGORA = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600))
ONTEM = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 86400))
FUTURO = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 86400 * 20))
EMAIL_LONGO = "maria.aparecida.dos.santos.oliveira.de.souza@provedor-de-email.com.br"

USO = {"resumo": {"lojas": 3, "usando_7d": 2, "pecas": 59, "vendas_30d": 12, "valor_vendas_30d": 1234, "romaneios_30d": 4, "beta": 2, "pagantes": 1},
       "lojas": [
           {"id": "l1", "nome": "Ateliê da Maria Aparecida Semijoias e Acessórios Finos", "dona_email": EMAIL_LONGO, "situacao": "beta", "plano": "crescimento", "pecas": 40, "vendas_total": 30, "vendas_30d": 12, "romaneios_30d": 4, "consultoras": 3, "dias_restantes": 12, "ultima_atividade": AGORA},
           {"id": "l2", "nome": "Aguapé", "dona_email": "vini@x.com", "situacao": "encerrado", "plano": "crescimento", "pecas": 16, "vendas_total": 0, "vendas_30d": 0, "romaneios_30d": 1, "consultoras": 0, "dias_restantes": None, "ultima_atividade": ONTEM},
           {"id": "l3", "nome": "Loja Paga", "dona_email": "paga@x.com", "situacao": "pagante", "plano": "solo", "pecas": 3, "vendas_total": 1, "vendas_30d": 1, "romaneios_30d": 0, "consultoras": 0, "dias_restantes": None, "ultima_atividade": AGORA},
           {"id": "l4", "nome": "Sem Plano", "dona_email": "livre@x.com", "situacao": "livre", "plano": "solo", "pecas": 0, "vendas_total": 0, "vendas_30d": 0, "romaneios_30d": 0, "consultoras": 0, "dias_restantes": None, "ultima_atividade": None}]}
CONTAS = [{"id": "u1", "email": EMAIL_LONGO.replace("maria", "joana"), "criada_em": ONTEM, "ultimo_login": None, "beta": True, "consultora_de": None},
          {"id": "u2", "email": "carluchea@gmail.com", "criada_em": ONTEM, "ultimo_login": AGORA, "beta": False, "consultora_de": "Loja da Maria"}]
def acesso(email, ativo, obs=""):
    return {"id": "a-" + email, "email": email, "ativo": ativo, "expira_em": FUTURO if ativo else ONTEM, "obs": obs, "convite_token": "tok-" + email[:6], "criado_em": ONTEM}
BETA = [acesso(EMAIL_LONGO, False), acesso("carluchea@gmail.com", True, "dono - teste"), acesso("vini@x.com", False), acesso("ninguem@x.com", False), acesso("nova.cliente@x.com", True)]
PREVIA_SEM_LOJA = {**suporte.PREVIA, "lojas": [], "contagens": {}, "assinatura_status": None, "e_consultora_de": [], "email": "carluchea@gmail.com", "user_id": "u2"}
RPC = {"sou_admin_luxi": True, "uso_lojas_luxi": USO, "admin_contas_sem_loja": CONTAS, "admin_ver_loja": suporte.LOJA, "admin_prever_exclusao": suporte.PREVIA,
       "admin_exportar_loja": suporte.COPIA, "auditoria_admin_recente": []}

TELAS = [(320, 568), (360, 640), (390, 664), (430, 740)]  # alturas realistas, já descontando as barras do navegador
TEMAS = ["claro", "escuro"]

AUDITORIA = """(tema) => {
  const problemas = [], vw = innerWidth, vh = innerHeight;
  // só ignora o que está OCULTO de verdade. Um elemento colapsado em largura 0 é justamente o defeito a acusar (antes era descartado aqui).
  const visivel = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return (r.width > 0 || r.height > 0) && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  // 1) rolagem para o lado e peças que passam da borda
  if (document.documentElement.scrollWidth > vw + 1) problemas.push(`rolagem para o lado (${document.documentElement.scrollWidth} > ${vw})`);
  document.querySelectorAll('.oj-linha, .oj-card, .oj-bt, .oj-estado, .oj-in, .oj-seg, .oj-stat, .oj-modal').forEach(e => {
    if (!visivel(e)) return; const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) problemas.push(`passa da borda ${Math.round(r.left)}..${Math.round(r.right)}: ${e.className} "${(e.textContent || '').trim().slice(0, 28)}"`);
  });
  // 2) texto espremido (o defeito do iPhone: e-mail com largura 0 em 18 linhas)
  document.querySelectorAll('.oj-nome, .oj-quebra').forEach(e => {
    if (!visivel(e)) return; const txt = (e.textContent || '').trim(); if (txt.length < 6) return;
    const r = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 18, linhas = Math.round(r.height / lh);
    if (e.children.length === 0 && txt.length >= 10 && linhas >= 2 && txt.length / linhas < 9) problemas.push(`texto espremido (${(txt.length / linhas).toFixed(1)} caracteres por linha, ${Math.round(r.width)}px): "${txt.slice(0, 28)}"`);
    if (r.width < 48) problemas.push(`texto com ${Math.round(r.width)}px de largura: "${txt.slice(0, 28)}"`);
    if (linhas > 5 && txt.length < 90) problemas.push(`texto em ${linhas} linhas: "${txt.slice(0, 28)}"`);
  });
  // 3) alvos de toque >= 44 px
  document.querySelectorAll('.oj-acoes button, .oj-seg button, .oj-excl-rodape button, .oj-excl-x, .oj-link-linha button, .oj-zona-risco button').forEach(e => {
    if (!visivel(e)) return; const r = e.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) problemas.push(`alvo de toque pequeno ${Math.round(r.width)}x${Math.round(r.height)}: "${e.textContent.trim().slice(0, 24)}"`);
  });
  // 4) campos com pelo menos 16 px (senão o iPhone dá zoom ao tocar)
  document.querySelectorAll('.oj input:not([type=checkbox]), .oj textarea').forEach(e => {
    if (!visivel(e)) return; const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 16) problemas.push(`campo com ${fs}px (<16 dá zoom no iPhone): ${e.getAttribute('aria-label') || e.placeholder || e.type}`);
  });
  // 5) contraste do texto (WCAG AA)
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
  const sobre = (f, b) => ({r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1});
  const base = tema === 'escuro' ? {r: 23, g: 11, b: 12, a: 1} : {r: 251, g: 248, b: 249, a: 1};
  const fundo = (e) => { const pilha = []; for (let n = e; n; n = n.parentElement) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg.a > 0) { pilha.push(bg); if (bg.a >= 1) break; } }
    let c = (pilha.length && pilha[pilha.length - 1].a >= 1) ? pilha.pop() : base; while (pilha.length) c = sobre(pilha.pop(), c); return c; };
  const lum = ({r, g, b}) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const razao = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const vistos = new Set();
  document.querySelectorAll('.oj-seg *, .oj-linha *, .oj-card *, .oj-excl *, .oj-zona-risco *, .oj-sec, .oj-aviso *').forEach(e => {
    if (!visivel(e) || e.closest('[disabled]') || e.closest('.oj-sair-espiao')) return;
    const proprio = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!proprio) return;
    const cs = getComputedStyle(e), fg = parse(cs.color); if (!fg) return;
    const bg = fundo(e), cor = sobre(fg, bg), r = razao(cor, bg);
    const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700), minimo = grande ? 3 : 4.5;
    if (r < minimo) { const k = e.textContent.trim().slice(0, 24) + r.toFixed(1); if (!vistos.has(k)) { vistos.add(k); problemas.push(`contraste ${r.toFixed(2)}:1 (<${minimo}) "${e.textContent.trim().slice(0, 24)}"`); } }
  });
  return problemas;
}"""

def abrir_painel(b, w, h, tema):
    ctx, _ = preparar_contexto(b, {"width": w, "height": h}, tabelas={"acessos_beta": BETA}, rpc=RPC)
    ctx.add_init_script(f"localStorage.setItem('luxi:tema','{tema}')")
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:100]))
    pg.goto(SRV.url); esperar_app(pg)
    pg.click(".oj-hamb"); pg.wait_for_timeout(300); pg.click("nav.oj-lateral >> text=Uso do Luxi"); pg.wait_for_selector(".oj-seg"); pg.wait_for_timeout(300)
    return ctx, pg, erros

def checar(pg, nome, tema, ruim, foto=None):
    pg.wait_for_timeout(250)
    if foto: pg.screenshot(path=foto)
    for p in pg.evaluate(AUDITORIA, tema): ruim.append(f"[{nome}] {p}")

def rodar(fotos=False):
    global SRV
    SRV = Servidor(); ruim = []; total = 0
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        for (w, h) in TELAS:
            for tema in TEMAS:
                tag = f"{w}px {tema}"; foto = lambda n: (f"/tmp/shots/cel-{n}-{w}-{tema}.png" if fotos and w == 390 else None)
                ctx, pg, erros = abrir_painel(b, w, h, tema)
                # A) seção Lojas  B) seção Acessos  C) seção Suporte
                checar(pg, f"{tag} · Lojas (topo)", tema, ruim, foto("1-lojas"))
                pg.evaluate("document.querySelector('.oj-linha').scrollIntoView({block:'start'})"); pg.evaluate("window.scrollBy(0,-150)")
                checar(pg, f"{tag} · Lojas (cartões)", tema, ruim)
                pg.evaluate("[...document.querySelectorAll('.oj-sec')].find(e=>e.textContent.includes('Contas sem loja')).scrollIntoView({block:'start'})"); pg.evaluate("window.scrollBy(0,-150)")
                checar(pg, f"{tag} · Contas sem loja", tema, ruim, foto("2-contas"))
                pg.evaluate("window.scrollTo(0,0)"); pg.click("[aria-label='Seções do painel'] >> text=Acessos"); pg.wait_for_selector("text=Clientes liberadas")
                pg.evaluate("document.querySelectorAll('.oj-card')[document.querySelectorAll('.oj-card').length-1].scrollIntoView({block:'start'})"); pg.evaluate("window.scrollBy(0,-150)")
                checar(pg, f"{tag} · Acessos", tema, ruim, foto("3-acessos"))
                pg.evaluate("window.scrollTo(0,0)"); pg.click("[aria-label='Seções do painel'] >> text=Suporte"); pg.wait_for_selector("text=Ajudar uma cliente a entrar")
                checar(pg, f"{tag} · Suporte", tema, ruim)
                # D) loja observada, no fim da página (zona de risco)
                pg.click("[aria-label='Seções do painel'] >> text=Lojas"); pg.wait_for_timeout(200)
                pg.click("button[aria-label*='Ateliê da Maria']"); pg.wait_for_selector("text=Modo observação")
                pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                checar(pg, f"{tag} · Loja observada (fim)", tema, ruim, foto("4-observada"))
                # E) janela de exclusão (loja com assinatura ativa: todos os blocos)
                pg.click("text=Excluir esta cliente e os dados dela"); pg.wait_for_selector("text=Será apagado de forma permanente"); pg.wait_for_timeout(300)
                checar(pg, f"{tag} · Janela de exclusão", tema, ruim, foto("5-janela"))
                j = pg.evaluate("""() => { const m = document.querySelector('.oj-modal').getBoundingClientRect(); const bs = [...document.querySelectorAll('.oj-excl-rodape button')].map(b => b.getBoundingClientRect());
                    return { topo: Math.round(m.top), base: Math.round(m.bottom), vh: innerHeight, rodapeVisivel: bs.length === 2 && bs.every(r => r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1) }; }""")
                if j["topo"] < 0 or j["base"] > j["vh"] + 1: ruim.append(f"[{tag} · Janela] passa da tela ({j['topo']}..{j['base']} de {j['vh']})")
                if not j["rodapeVisivel"]: ruim.append(f"[{tag} · Janela] botões Cancelar/Excluir não ficam à vista sem rolar")
                # o miolo rola e o rodapé continua à vista
                pg.evaluate("document.querySelector('.oj-excl-corpo').scrollTop = 99999"); pg.wait_for_timeout(150)
                if not pg.evaluate("(() => { const r = document.querySelector('.oj-excl-rodape').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= 0; })()"):
                    ruim.append(f"[{tag} · Janela] rodapé some quando o miolo rola até o fim")
                pg.click(".oj-modal >> text=Cancelar"); pg.wait_for_timeout(150)
                # F) janela de exclusão de conta sem loja
                pg.evaluate("window.scrollTo(0,0)"); pg.click(".oj-sair-espiao"); pg.wait_for_selector(".oj-seg")
                pg.route("**/rest/v1/rpc/admin_prever_exclusao", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(PREVIA_SEM_LOJA), headers={"access-control-allow-origin": "*"}))
                pg.evaluate("[...document.querySelectorAll('.oj-sec')].find(e=>e.textContent.includes('Contas sem loja')).scrollIntoView({block:'start'})")
                pg.click("button[aria-label='Excluir a conta de carluchea@gmail.com']"); pg.wait_for_selector("text=Excluir conta"); pg.wait_for_timeout(500)
                checar(pg, f"{tag} · Janela (conta sem loja)", tema, ruim, foto("6-janela-conta"))
                if erros: ruim.append(f"[{tag}] erro de JS: {erros[0]}")
                total += 1; ctx.close()
        b.close()
    # AUTO-TESTE DO DETECTOR: reproduz o defeito exato do iPhone e exige que a auditoria o acuse
    with sync_playwright() as p2:
        b2 = p2.chromium.launch(); ctx2, pg2, _ = abrir_painel(b2, 390, 844, "escuro")
        pg2.evaluate("""() => { const c = document.querySelector('.oj-card'); c.insertAdjacentHTML('beforeend',
            '<div class="oj-item" style="align-items:flex-start"><div class="oj-quebra oj-nome" style="flex:1;min-width:0;word-break:break-all">carluchea@gmail.com</div>'
          + '<button class="oj-link-sutil" style="padding:6px 0">Excluir…</button></div>'); }""")
        achados = pg2.evaluate(AUDITORIA, "escuro")
        if not any("espremido" in x or "largura" in x for x in achados): ruim.append("O DETECTOR NÃO PEGOU o defeito original do iPhone (e-mail na vertical)")
        else: print("✅ auto-teste do detector: o defeito original do iPhone é acusado →", [x for x in achados if "espremido" in x or "largura" in x][0][:90])
        b2.close()
    SRV.parar()
    print(("✅" if not ruim else "❌"), f"painel no celular: {total} combinações (4 larguras × 2 temas), 7 telas cada" + ("" if not ruim else f" — {len(ruim)} problema(s)"))
    for r in ruim[:40]: print("   ", r)
    return len(ruim)

if __name__ == "__main__":
    sys.exit(1 if rodar(fotos=True) else 0)
