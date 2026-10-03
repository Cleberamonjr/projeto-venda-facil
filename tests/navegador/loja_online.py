"""Tela "Loja on-line" (antes Catálogo) em navegador real: publicar com um toque, sincronizar peças novas,
WhatsApp só com o link, sem o endereço falso luxi.app, demonstração, plano em leitura, celular.
Uso: python3 tests/navegador/loja_online.py [--fotos]"""
import sys, urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, esperar_app
import lona_editor as le
import csp
from playwright.sync_api import sync_playwright

def abrir_hub(pg):
    esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(250)
    pg.click("nav.oj-lateral >> text=Loja on-line"); pg.wait_for_selector(".lona-ed")

def rodar(fotos=False):
    srv = Servidor(); prob = []; ok = []
    def check(c, m): (ok if c else prob).append(m)
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        # A) publicar com um toque (sem WhatsApp cadastrado)
        st = le.novo_estado("dona"); ctx = le.contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:120])); pg.goto(srv.url); abrir_hub(pg)
        txt = pg.inner_text(".lona-ed").lower()
        check("fora do ar" in txt and pg.query_selector("button:has-text('Abrir minha loja on-line')") is not None, "loja ainda fechada: oferece abrir com um toque")
        check("luxi.app" not in pg.inner_text("body"), "nenhum endereço falso luxi.app na tela")
        pg.click("button:has-text('Abrir minha loja on-line')")
        check("whatsapp" in pg.inner_text("[role=alert]").lower(), "sem WhatsApp informado: pede o número em vez de publicar")
        check(not [c for c in st["rpc"] if c[0] == "lona_publicar"], "nada foi publicado sem o WhatsApp")
        pg.fill("#lo-zap", "(11) 99999-8888"); pg.click("button:has-text('Abrir minha loja on-line')"); pg.wait_for_selector("[data-teste=link-loja]")
        sv = [c for c in st["rpc"] if c[0] == "lona_salvar"][-1][1]["p_rascunho"]
        check(sv["ordem"] == ["p1", "p2", "p3"], f"entraram todas as peças COM estoque (a esgotada não): {sv['ordem']}")
        check(sv["whatsapp"] == "11999998888" and all(sv["itens"][i]["preco"] == "preco" for i in sv["ordem"]), "WhatsApp salvo e preços começam nos da loja")
        check(sv["itens"]["p2"]["centavos"] == 18900, "preço de cada peça = preço da loja")
        check(any(c[0] == "lona_publicar" for c in st["rpc"]), "publicou")
        link = pg.inner_text("[data-teste=link-loja]")
        check(link.endswith("?m=dona-teste"), f"link da loja no padrão ?m=: {link}")
        check("no ar" in pg.inner_text(".oj-estado").lower(), "estado vira 'No ar'")
        check("1 peça está sem foto" in pg.inner_text(".lona-ed") or "peças estão sem foto" in pg.inner_text(".lona-ed"), "avisa quantas peças estão sem foto")
        # B) mandar no WhatsApp: só o link
        pg.fill("#lo-zc", "(11) 98888-7777")
        href = pg.get_attribute("a:has-text('Enviar no WhatsApp')", "href"); dec = urllib.parse.unquote(href)
        check(href.startswith("https://wa.me/5511988887777?text="), "WhatsApp abre na conversa da cliente (55 + DDD)")
        check("?m=dona-teste" in dec and "Loja X" in dec, "a mensagem leva o nome da loja e o LINK")
        check("Anel" not in dec and "AN-1" not in dec and "R$" not in dec, "a mensagem NÃO lista produtos nem preços")
        pg.fill("#lo-tx", "Oi! Minha loja nova: " + link)
        check("Minha loja nova" in urllib.parse.unquote(pg.get_attribute("a:has-text('Enviar no WhatsApp')", "href")), "a mensagem pode ser editada")
        # C) peça nova no estoque -> botão de adicionar
        st["lona"]["rascunho"]["ordem"] = ["p1"]; st["lona"]["publicado"]["ordem"] = ["p1"]
        pg.reload(); abrir_hub(pg); pg.wait_for_selector("[data-teste=link-loja]")
        check("peças novas no estoque" in pg.inner_text(".lona-ed"), "peças novas no estoque são anunciadas")
        pg.click("button:has-text('Adicionar 2 peças')"); pg.wait_for_selector("text=publicadas")
        sv = [c for c in st["rpc"] if c[0] == "lona_salvar"][-1][1]["p_rascunho"]
        check(sv["ordem"] == ["p1", "p2", "p3"], f"sincronizou mantendo as que já estavam: {sv['ordem']}")
        # D) atalhos
        pg.click("button:has-text('Ver pedidos')"); pg.wait_for_selector(".lona-ed [role=tab]")
        check(pg.query_selector(".lona-ed [role=tab]") is not None, "atalho 'Ver pedidos' abre a tela de edição e pedidos")
        pg.click("text=‹ Voltar ao painel") if pg.query_selector("text=‹ Voltar ao painel") else None
        # E) avulso continua
        abrir_hub(pg)
        pg.click("summary:has-text('Enviar peças avulsas')"); pg.wait_for_timeout(300)
        check("Escolha as peças e envie direto" in pg.inner_text(".lona-ed-avulso"), "o envio de peças avulsas (Catálogo antigo) continua disponível")
        check("luxi.app" not in pg.inner_text("body"), "nem no envio avulso há o endereço falso")
        m = pg.evaluate("({l: document.documentElement.scrollWidth, j: innerWidth})")
        check(m["l"] <= m["j"], "celular: não rola para o lado")
        check(not erros, f"sem erro de JavaScript {erros[:2]}")
        if fotos: pg.screenshot(path="/tmp/shots/hub.png", full_page=False)
        ctx.close()

        # F) WhatsApp já cadastrado: nem pergunta
        st = le.novo_estado("dona"); st["whatsapp_loja"] = "5511977776666"
        ctx = le.contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_hub(pg)
        check(pg.query_selector("#lo-zap") is None or pg.input_value("#lo-zap") == "11977776666", "WhatsApp da loja já vem preenchido")
        ctx.close()
        # G) consultora
        st = le.novo_estado("consultora"); ctx = le.contexto(b, {"width": 390, "height": 844}, "consultora", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_hub(pg)
        check(any(c[0] == "lona_minha" and c[1]["p_consultora"] == "c2" for c in st["rpc"]), "consultora vê a PRÓPRIA loja on-line")
        check(pg.query_selector("#lo-zap") is not None, "consultora informa o próprio WhatsApp para receber os pedidos")
        ctx.close()
        # H) plano em leitura
        st = le.novo_estado("dona", pode_editar=False); ctx = le.contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_hub(pg)
        check(pg.is_disabled("button:has-text('Abrir minha loja on-line')") and "modo leitura" in pg.inner_text(".lona-ed"), "plano vencido: não abre a loja, explica por quê")
        ctx.close()
        # I) demonstração: o Catálogo de sempre
        ctx, pg, _, er = csp.novo(b, srv, logado=False)
        pg.goto(srv.url); pg.wait_for_selector("text=Entrar", timeout=15000); pg.click("text=ver uma demonstração"); pg.wait_for_selector(".oj-tour-fundo", timeout=15000)
        pg.click("text=Pular tour"); esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(250); pg.click("nav.oj-lateral >> text=Loja on-line"); pg.wait_for_timeout(700)
        check("Escolha as peças e envie direto" in pg.inner_text("body") and "luxi.app" not in pg.inner_text("body"), "demonstração: o envio de peças funciona e sem endereço falso")
        ctx.close(); b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in prob: print("PROBLEMA:", m)
    return len(prob)

if __name__ == "__main__":
    sys.exit(1 if rodar("--fotos" in sys.argv) else 0)
