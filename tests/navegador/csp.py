"""Política de segurança (CSP) testada em NAVEGADOR REAL: aplica a política COMPLETA em modo que BLOQUEIA
e percorre o app inteiro. Qualquer coisa que o navegador barrar aparece aqui — antes de chegar a um usuário."""
import sys, re, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
import suporte
from playwright.sync_api import sync_playwright

FOTO = "/tmp/foto-teste.jpg"
def gerar_foto():
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (1600, 1200), (200, 170, 160)); d = ImageDraw.Draw(im)
    for i in range(0, 1600, 80): d.line([(i, 0), (1600 - i, 1200)], fill=(120, 60, 70), width=6)
    im.save(FOTO, "JPEG", quality=90)

def politica_completa(remover=None):
    """A política do Report-Only do _headers, sem o report-uri, para ser aplicada como BLOQUEIO."""
    for padrao, hs in ler_headers(DIST / "_headers"):
        if "Content-Security-Policy-Report-Only" in hs:
            pol = re.sub(r";?\s*report-uri [^;]*", "", hs["Content-Security-Policy-Report-Only"]).strip().rstrip(";")
            if remover: pol = pol.replace(remover, "")
            return pol
    raise SystemExit("Content-Security-Policy-Report-Only não encontrado no _headers")

GANCHO = """
window.__csp = [];
document.addEventListener('securitypolicyviolation', e => window.__csp.push({diretiva: e.effectiveDirective, bloqueado: e.blockedURI, arquivo: (e.sourceFile||'').replace(location.origin,''), linha: e.lineNumber}));
"""
def violacoes(pg):
    v = pg.evaluate("window.__csp || []")
    return [x for x in v if "csp-sinal.invalid" not in x["bloqueado"]]   # o sinal de vida é de propósito

def novo(browser, srv, tabelas=None, rpc=None, logado=True, tema=None):
    grava = []
    ctx, _ = preparar_contexto(browser, {"width": 1366, "height": 768}, tabelas=tabelas, rpc=rpc, logado=logado, capturas=grava)
    ctx.add_init_script(GANCHO)
    if tema: ctx.add_init_script(f"localStorage.setItem('luxi:tema','{tema}')")
    pg = ctx.new_page(); erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
    return ctx, pg, grava, erros

def menu_aberto(pg): return pg.evaluate("!!document.querySelector('nav.oj-lateral.aberto')")
def garantir_menu(pg, abrir):
    if menu_aberto(pg) != abrir:
        if abrir: pg.click(".oj-hamb")
        else: pg.mouse.click(1330, 400)          # toque fora da gaveta fecha
        pg.wait_for_timeout(300)

def percorrer_menu(pg):
    """Abre cada item do menu lateral (menos Sair / Baixar o app), como uma pessoa faria."""
    garantir_menu(pg, True)
    n = pg.evaluate("document.querySelectorAll('nav.oj-lateral button').length")
    for i in range(n):
        garantir_menu(pg, True)
        rotulo = pg.evaluate(f"document.querySelectorAll('nav.oj-lateral button')[{i}]?.textContent || ''")
        if re.search(r"Sair|Baixar o app", rotulo): continue
        pg.evaluate(f"document.querySelectorAll('nav.oj-lateral button')[{i}]?.click()"); pg.wait_for_timeout(450)
    garantir_menu(pg, False)

def rodar(politica, verbose=True):
    gerar_foto(); srv = Servidor(extra={"Content-Security-Policy": politica}); resultado = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1) visitante: login e demonstração
        ctx, pg, _, er = novo(b, srv, logado=False)
        pg.goto(srv.url); pg.wait_for_selector("text=Entrar", timeout=15000)
        pg.click("text=ver uma demonstração"); pg.wait_for_selector(".oj-tour-fundo", timeout=15000)
        pg.click("text=Pular tour"); esperar_app(pg); pg.wait_for_timeout(400); percorrer_menu(pg)
        bruto = pg.evaluate("window.__csp || []")
        sinal_visto = any("csp-sinal.invalid" in x["bloqueado"] for x in bruto)
        resultado["visitante + demonstração"] = (violacoes(pg), er + ([] if sinal_visto else ["o detector NÃO viu o sinal de vida (canal de violações mudo)"])); ctx.close()

        # 2) cliente com loja: abas, cadastro de produto COM FOTO, salvar
        ctx, pg, grava, er = novo(b, srv, tabelas=loja_padrao(4))
        pg.goto(srv.url); esperar_app(pg); percorrer_menu(pg)
        pg.click(".oj-atalhos >> text=Peças"); pg.click("text=+ Cadastrar produto"); pg.wait_for_selector(".oj-editor-modal")
        pg.set_input_files("input[type=file]", FOTO)
        previa_ok = True
        try: pg.wait_for_selector(".oj-editor-modal [style*='data:image']", timeout=8000)
        except Exception: previa_ok = False
        pg.fill(".oj-editor-modal .oj-campo:has(label:text-is('Nome')) input", "Anel com foto"); pg.wait_for_timeout(200)
        pg.click("text=Incluir no estoque"); pg.wait_for_timeout(1500)
        enviou_foto = any(c[0] == "storage" for c in grava); gravou_peca = any(c[0] == "pecas" and c[1] == "POST" for c in grava)
        resultado["cliente + cadastro de produto com foto"] = (violacoes(pg), er + ([] if previa_ok else ["a prévia da foto NÃO apareceu"]) + ([] if enviou_foto else ["a foto NÃO foi enviada ao armazenamento"]) + ([] if gravou_peca else ["a peça NÃO foi gravada"]))
        ctx.close()

        # 3) administradora
        uso = {"resumo": {"lojas": 1, "usando_7d": 0, "pecas": 0, "vendas_30d": 0, "valor_vendas_30d": 0, "romaneios_30d": 0, "beta": 0, "pagantes": 0},
               "lojas": [{"id": "l1", "nome": "Loja A", "dona_email": "a@a.com", "situacao": "beta", "plano": "crescimento", "pecas": 1, "vendas_total": 0, "vendas_30d": 0, "romaneios_30d": 0, "consultoras": 0, "dias_restantes": 20, "ultima_atividade": None}]}
        ctx, pg, _, er = novo(b, srv, rpc={"sou_admin_luxi": True, "uso_lojas_luxi": uso, "auditoria_admin_recente": [], "admin_ver_loja": suporte.LOJA})
        pg.goto(srv.url); esperar_app(pg); percorrer_menu(pg)
        garantir_menu(pg, True); pg.evaluate("[...document.querySelectorAll('nav.oj-lateral button')].find(b => b.textContent.includes('Uso do Luxi'))?.click()"); pg.wait_for_selector("button[aria-label*='Loja A']", timeout=8000)
        pg.click("button[aria-label*='Loja A']"); pg.wait_for_selector("text=Modo observação", timeout=8000); pg.wait_for_timeout(500)
        resultado["administradora"] = (violacoes(pg), er); ctx.close()

        # 4) link de convite do beta (tema escuro também)
        ctx, pg, _, er = novo(b, srv, logado=False, rpc={"validar_convite_beta": {"email": "c@c.com", "dias": 30, "ativo": True, "usado": False}}, tema="escuro")
        pg.goto(srv.url + "?beta=" + "T" * 32); pg.wait_for_selector("text=Seu acesso ao beta", timeout=15000)
        resultado["link de convite (tema escuro)"] = (violacoes(pg), er); ctx.close()
        # 5) service worker LIGADO: o app precisa conseguir se instalar e recarregar sob a política
        grava = []
        ctx, _ = preparar_contexto(b, {"width": 1366, "height": 768}, tabelas=loja_padrao(2), capturas=grava, sw="allow")
        ctx.add_init_script(GANCHO); pg = ctx.new_page(); er = []
        pg.on("pageerror", lambda e: er.append(str(e)[:120]))
        pg.goto(srv.url); esperar_app(pg)
        try:
            pg.wait_for_function("navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active || r.waiting || r.installing)))", timeout=10000)
            registrou = True
        except Exception: registrou = False
        pg.wait_for_timeout(1500); pg.reload(); esperar_app(pg)
        resultado["service worker ligado (instalar/recarregar)"] = (violacoes(pg), er + ([] if registrou else ["o service worker NÃO registrou"]))
        ctx.close()
        b.close()
    srv.parar()
    return resultado

def relatar(resultado):
    ruim = 0
    for fluxo, (viol, erros) in resultado.items():
        ok = not viol and not erros; ruim += (not ok)
        print(("✅" if ok else "❌"), fluxo)
        for v in viol: print("     BLOQUEADO:", v["diretiva"], "→", v["bloqueado"], "|", v["arquivo"], v["linha"])
        for e in erros: print("     problema:", e)
    return ruim

if __name__ == "__main__":
    pol = politica_completa()
    print("Política aplicada (BLOQUEANDO):\n  " + pol.replace("; ", ";\n  ") + "\n")
    sys.exit(1 if relatar(rodar(pol)) else 0)
