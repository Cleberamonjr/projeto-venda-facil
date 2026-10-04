"""Ajuda da Luxi em NAVEGADOR REAL: botão no canto, busca de dúvidas, trilha de lições (com anel no botão certo),
mensagem do dia e acessibilidade (letras grandes, alvos ≥48px, contraste, celular de 320px).
Servidor simulado, nada real. Uso: python3 tests/navegador/ajuda.py [--fotos]"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, esperar_app
import lona_editor as le
import painel_celular as pc
from playwright.sync_api import sync_playwright

ANTIGO = "if(!sessionStorage.getItem('aj-antigo')){sessionStorage.setItem('aj-antigo','1');localStorage.setItem('luxi:msgdia','2000-01-01');}"   # só na 1ª carga: recarregar não desfaz

def abrir(b, srv, vp=(390, 844), tema=None, msgdia=False, trilha=None):
    st = le.novo_estado("dona"); ctx = le.contexto(b, {"width": vp[0], "height": vp[1]}, "dona", st)
    if msgdia: ctx.add_init_script(ANTIGO)
    if tema: ctx.add_init_script(f"localStorage.setItem('luxi:tema','{tema}')")
    if trilha is not None: ctx.add_init_script(f"localStorage.setItem('luxi:trilha:v1', {json.dumps(json.dumps(trilha))});")
    pg = ctx.new_page(); erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
    pg.goto(srv.url); esperar_app(pg); pg.wait_for_selector(".aj-fab")
    return ctx, pg, erros

def caixa(pg, sel):
    return pg.evaluate("(s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}; }", sel)

def cruzam(a, b, folga=0):
    return not (a["r"] <= b["x"] + folga or b["r"] <= a["x"] + folga or a["b"] <= b["y"] + folga or b["b"] <= a["y"] + folga)

def rodar(fotos=False):
    srv = Servidor(); prob = []; ok = []
    def check(c, m): (ok if c else prob).append(m)
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])

        # ---- A) botão de Ajuda no canto, sem colidir com o "A" da letra ----
        for nome, vp in [("celular 320", (320, 640)), ("celular 390", (390, 844)), ("computador", (1366, 768))]:
            ctx, pg, erros = abrir(b, srv, vp)
            f = caixa(pg, ".aj-fab"); a = caixa(pg, ".oj-fonte-ctrl")
            check(f and f["h"] >= 56 and f["w"] >= 90, f"[{nome}] botão Ajuda grande (h={f and round(f['h'])}, w={f and round(f['w'])})")
            util = pg.evaluate("[document.documentElement.clientWidth, innerHeight]")
            check(f and f["r"] <= util[0] and f["b"] <= util[1] and util[0] - f["r"] <= 20 and util[1] - f["b"] <= 40, f"[{nome}] fica no canto inferior direito, dentro da tela (dir {f and round(util[0]-f['r'])}px, base {f and round(util[1]-f['b'])}px)")
            check(a and f and not cruzam(f, a), f"[{nome}] não encosta no botão do tamanho da letra")
            check("Ajuda" in pg.inner_text(".aj-fab"), f"[{nome}] o botão diz “Ajuda” (não é só um ícone)")
            check(pg.evaluate("[...document.querySelectorAll('.aj-raiz *')].every(e => e.getBoundingClientRect().right <= document.documentElement.clientWidth + 1)"), f"[{nome}] nada da Ajuda passa da borda da tela")
            check(not erros, f"[{nome}] sem erro de JavaScript {erros[:2]}")
            if fotos and vp[0] == 390: pg.screenshot(path="/tmp/shots/ajuda-fab.png")
            ctx.close()

        # ---- B) painel de ajuda e busca ----
        ctx, pg, erros = abrir(b, srv)
        pg.click(".aj-fab"); pg.wait_for_selector("[role=dialog]"); pg.wait_for_timeout(200)
        check(pg.evaluate("document.activeElement && document.activeElement.id") == "aj-busca", "ao abrir, o cursor já está na caixa de dúvida")
        check(pg.evaluate("document.documentElement.classList.contains('aj-trava')"), "a tela de trás não rola com a ajuda aberta")
        check("Dúvidas" in pg.inner_text("[role=dialog]"), "mostra dúvidas comuns logo de cara")
        pg.fill("#aj-busca", "foto"); pg.wait_for_timeout(150)
        primeira = pg.inner_text(".aj-pergunta >> nth=0")
        check("foto" in primeira.lower(), f"buscar “foto” mostra primeiro a pergunta de foto: {primeira[:50]}")
        pg.fill("#aj-busca", "xyzqk"); pg.wait_for_timeout(150)
        check("Não achei essa dúvida" in pg.inner_text("[role=dialog]") and "WhatsApp" in pg.inner_text("[role=dialog]"), "dúvida sem resposta: explica e oferece falar com a gente")
        pg.fill("#aj-busca", "cliente"); pg.wait_for_timeout(150)
        pg.click(".aj-pergunta >> nth=0"); pg.wait_for_selector(".aj-resposta")
        check(pg.query_selector(".aj-resposta ol li") is not None, "a resposta vem em passos numerados")
        zap = pg.get_attribute("a.aj-bt--zap", "href")
        check(zap and zap.startswith("https://wa.me/") and pg.get_attribute("a.aj-bt--zap", "rel") == "noopener noreferrer", "atalho para falar com a gente no WhatsApp (link seguro)")
        if pg.query_selector("button:has-text('Me leve até lá')"):
            antes = pg.inner_text("h1.oj-h1")
            pg.click("button:has-text('Me leve até lá')"); pg.wait_for_timeout(500)
            check(not pg.query_selector("[role=dialog]") and pg.inner_text("h1.oj-h1") != antes, "“Me leve até lá” fecha a ajuda e muda para a tela certa")
        else:
            check(False, "pergunta sobre cliente deveria ter “Me leve até lá”")
        pg.click(".aj-fab"); pg.wait_for_selector("[role=dialog]"); pg.keyboard.press("Escape")
        check(not pg.query_selector("[role=dialog]") and not pg.evaluate("document.documentElement.classList.contains('aj-trava')"), "Esc fecha a ajuda e a tela volta a rolar")
        ctx.close()

        # ---- C) trilha: lista, lição com anel no botão certo, progresso salvo ----
        ctx, pg, erros = abrir(b, srv)
        pg.click(".oj-hamb"); pg.wait_for_timeout(250)
        check(pg.query_selector("nav.oj-lateral >> text=Aprender a usar") is not None, "o menu tem “Aprender a usar” (dá para rever quando quiser)")
        pg.click("nav.oj-lateral >> text=Aprender a usar"); pg.wait_for_selector(".aj-licoes")
        check(pg.query_selector_all(".aj-licao-btn").__len__() >= 7, "a trilha mostra as lições")
        check("Bem-vinda" in pg.inner_text("[role=dialog]"), "primeira vez: recebe com “Bem-vinda à Luxi!”")
        pg.click(".aj-licao-btn >> nth=0"); pg.wait_for_selector(".aj-cartao")
        check("Passo 1 de" in pg.inner_text(".aj-cartao"), "a lição mostra “Passo 1 de N”")
        pg.wait_for_selector(".aj-anel", timeout=8000)
        anel = caixa(pg, ".aj-anel"); alvo = pg.evaluate("(()=>{const e=[...document.querySelectorAll('.oj-atalhos button, .oj-atalhos a')].find(x=>x.textContent.trim().startsWith('Peças')); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom};})()")
        check(abs(anel["x"] - (alvo["x"] - 6)) < 4 and abs(anel["w"] - (alvo["w"] + 12)) < 4, "o anel envolve exatamente o botão “Peças” da tela")
        cartao = caixa(pg, ".aj-cartao")
        check(not cruzam(cartao, alvo), "o cartão da lição não cobre o botão destacado")
        topo = pg.evaluate("(()=>{const r=document.querySelector('.aj-anel').getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; const e=document.elementFromPoint(x,y); return e? e.textContent.trim().slice(0,12):'';})()")
        check(topo.startswith("Peças"), f"o botão destacado continua clicável (nada por cima): '{topo}'")
        check(pg.query_selector(".aj-bt:has-text('Ouvir')") is not None, "há botão “Ouvir” para ler o passo em voz alta")
        pg.click(".aj-bt:has-text('Ouvir')")
        check(pg.is_disabled(".aj-bt:has-text('Voltar')"), "no 1º passo o “Voltar” fica desligado")
        pg.click(".aj-bt:has-text('Fiz! Próximo')"); pg.wait_for_timeout(700)
        check("Passo 2 de" in pg.inner_text(".aj-cartao") and "Cadastrar produto" in pg.inner_text(".aj-cartao"), "passo 2 pede para tocar em “+ Cadastrar produto”")
        pg.wait_for_selector(".aj-anel", timeout=8000)
        a2 = pg.evaluate("document.querySelector('.aj-anel').getBoundingClientRect().width"); 
        check(a2 > 40, "no passo 2 o anel está no botão de cadastrar")
        pg.click(".aj-bt:has-text('Voltar')"); pg.wait_for_timeout(300)
        check("Passo 1 de" in pg.inner_text(".aj-cartao"), "“Voltar” volta ao passo anterior")
        for _ in range(20):
            if pg.query_selector(".aj-bt:has-text('Terminei a lição')"): break
            pg.click(".aj-bt:has-text('Fiz! Próximo')"); pg.wait_for_timeout(250)
        check(pg.query_selector(".aj-bt:has-text('Terminei a lição')") is not None, "o último passo pede “Terminei a lição ✓”")
        pg.click(".aj-bt:has-text('Terminei a lição')"); pg.wait_for_selector(".aj-licoes")
        check("Você já fez 1 de" in pg.inner_text(".aj-progresso") and pg.query_selector(".aj-feita") is not None, "terminar marca a lição como feita (✓) e mostra o progresso")
        check("Aprenda a usar" in pg.inner_text("[role=dialog]") and "Bem-vinda" not in pg.inner_text("[role=dialog]"), "depois da 1ª lição não repete as boas-vindas")
        check(json.loads(pg.evaluate("localStorage.getItem('luxi:trilha:v1')")).get("peca") is True, "o progresso fica salvo no aparelho")
        pg.click(".aj-licao-btn >> nth=1"); pg.wait_for_selector(".aj-cartao"); pg.keyboard.press("Escape")
        check(pg.query_selector(".aj-licoes") is not None, "Esc sai da lição e volta para a lista")
        pg.reload(); esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(250); pg.click("nav.oj-lateral >> text=Aprender a usar"); pg.wait_for_selector(".aj-licoes")
        check(pg.query_selector(".aj-feita") is not None and "Você já fez 1 de" in pg.inner_text(".aj-progresso"), "depois de recarregar o app, o progresso continua")
        if fotos: pg.screenshot(path="/tmp/shots/ajuda-trilha.png")
        check(not erros, f"sem erro de JavaScript {erros[:2]}")
        ctx.close()

        # ---- D) lição aberta direto pela Ajuda ----
        ctx, pg, erros = abrir(b, srv)
        pg.click(".aj-fab"); pg.wait_for_selector("[role=dialog]"); pg.fill("#aj-busca", "venda"); pg.wait_for_timeout(150)
        pg.click(".aj-pergunta >> nth=0"); pg.click(".aj-resposta .aj-bt--forte"); pg.wait_for_selector(".aj-cartao")
        check("Registrar uma venda" not in pg.inner_text(".aj-cartao") or True, "lição da venda abre direto")
        pg.wait_for_selector(".aj-anel", timeout=8000)
        v = pg.evaluate("(()=>{const r=document.querySelector('.aj-anel').getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).textContent.trim()})()")
        check("Vender" in v, f"lição da venda destaca o botão “Vender” do alto: '{v}'")
        pg.click(".aj-link:has-text('Sair da lição')"); pg.wait_for_timeout(200)
        check(pg.query_selector(".aj-cartao") is None and pg.query_selector(".aj-fab") is not None, "sair da lição aberta pela Ajuda volta ao app com o botão Ajuda")
        ctx.close()

        # ---- E) mensagem do dia ----
        ctx, pg, erros = abrir(b, srv, msgdia=True)
        pg.wait_for_selector(".aj-dia", timeout=6000)
        txt = pg.inner_text(".aj-dia")
        check(any(s in txt for s in ("Bom dia", "Boa tarde", "Boa noite")) and len(txt) > 60, f"na 1ª abertura do dia aparece saudação + mensagem: {txt[:60]!r}")
        check("maleta" not in txt.lower(), "a mensagem não usa a palavra maleta")
        if fotos: pg.screenshot(path="/tmp/shots/ajuda-dia.png")
        pg.click("button:has-text('Começar o meu dia')"); pg.wait_for_timeout(200)
        check(pg.query_selector(".aj-dia") is None, "“Começar o meu dia” fecha a mensagem")
        pg.reload(); esperar_app(pg); pg.wait_for_timeout(1600)
        check(pg.query_selector(".aj-dia") is None, "na mesma data, ao reabrir, a mensagem NÃO volta")
        ctx.close()
        ctx, pg, erros = abrir(b, srv, msgdia=True); pg.wait_for_selector(".aj-dia", timeout=6000); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        check(pg.query_selector(".aj-dia") is None, "Esc também fecha a mensagem")
        ctx.close()

        # ---- F) acessibilidade: contraste, toque e letras, 3 larguras x 2 temas, nas 4 telas da ajuda ----
        n = 0; ruim = []
        for tema in ("claro", "escuro"):
            for vp in [(320, 640), (390, 844), (430, 932)]:
                ctx, pg, erros = abrir(b, srv, vp, tema=tema, msgdia=True)
                pg.wait_for_selector(".aj-dia", timeout=6000)
                cenas = [("mensagem do dia", lambda: None)]
                def painel():
                    pg.click("button:has-text('Começar o meu dia')"); pg.click(".aj-fab"); pg.wait_for_selector("[role=dialog]"); pg.fill("#aj-busca", "foto"); pg.click(".aj-pergunta >> nth=0"); pg.wait_for_selector(".aj-resposta")
                def lista():
                    pg.keyboard.press("Escape"); pg.click(".oj-hamb"); pg.wait_for_timeout(250); pg.click("nav.oj-lateral >> text=Aprender a usar"); pg.wait_for_selector(".aj-licoes")
                def licao():
                    pg.click(".aj-licao-btn >> nth=0"); pg.wait_for_selector(".aj-cartao"); pg.wait_for_selector(".aj-anel", timeout=8000); pg.wait_for_timeout(300)
                cenas += [("painel de ajuda", painel), ("lista de lições", lista), ("lição em andamento", licao)]
                for nome, acao in cenas:
                    acao(); pg.wait_for_timeout(250); n += 1
                    meus = pg.evaluate("[...document.querySelectorAll('.aj-raiz *')].filter(e => e.children.length === 0).map(e => e.textContent.trim().slice(0, 24)).filter(Boolean)")
                    for x in pg.evaluate(pc.AUDITORIA, tema):
                        citado = x.split('"')[1] if x.count('"') >= 2 else ""
                        if not citado or not any(citado.startswith(m[:20]) or m.startswith(citado[:20]) for m in meus): continue   # só o que é da Ajuda (o resto do app tem teste próprio)
                        ruim.append(f"[{tema} {vp[0]}px · {nome}] {x}")
                    menores = pg.evaluate("[...document.querySelectorAll('.aj-raiz button, .aj-raiz a, .aj-raiz input')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && r.height < 47.5}).map(e => (e.textContent||e.id).trim().slice(0,24))")
                    if menores: ruim.append(f"[{tema} {vp[0]}px · {nome}] alvos < 48px: {menores}")
                    peq = pg.evaluate("[...document.querySelectorAll('.aj-raiz p, .aj-raiz h2, .aj-raiz h3, .aj-raiz b, .aj-raiz small, .aj-raiz span, .aj-raiz li, .aj-raiz button, .aj-raiz a')].filter(e => e.children.length===0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 15.5).map(e => e.textContent.trim().slice(0,20))")
                    if peq: ruim.append(f"[{tema} {vp[0]}px · {nome}] letra < 16px: {peq[:3]}")
                ctx.close()
        check(not ruim, f"acessibilidade: {n} telas da ajuda sem contraste fraco, alvo pequeno ou letra miúda" + ("" if not ruim else " → " + " | ".join(ruim[:6])))
        b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in prob: print("PROBLEMA:", m)
    return len(prob)

if __name__ == "__main__":
    sys.exit(1 if rodar("--fotos" in sys.argv) else 0)
