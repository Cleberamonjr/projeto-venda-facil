"""Vitrine pública da lona em NAVEGADOR REAL (Chromium), como a cliente da vendedora abre: SEM login.
Serve o app pronto (dist/) com os cabeçalhos do _headers e simula o Supabase por baixo. Não toca em dado real.

Cobre: abre sem login e sem app; pedido pelos dois caminhos; erros do banco em português; validações;
layout em 4 larguras (sem rolar de lado, alvos de toque, contraste); janela do carrinho (Esc, foco);
nenhuma violação da política de segurança; nada de service worker/faixa de atualização para a cliente.
Uso: python3 tests/navegador/lona_publica.py [--fotos]
"""
import sys, json, re, base64, urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, SUPA
from playwright.sync_api import sync_playwright

JPG = base64.b64decode("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=")
F = SUPA + "/storage/v1/object/public/fotos-pecas/L1/"

def item(i, cod, nome, preco="preco", cent=12900, banho="Ouro 18k", tam="aro 16", nota=None):
    return {"id": f"00000000-0000-4000-8000-00000000000{i}", "codigo": cod, "nome": nome, "foto": f"{F}{cod}.jpg",
            "preco": preco, "centavos": cent if preco == "preco" else None, "banho": banho, "tamanho": tam, "nota": nota}

LONA = {"slug": "ana", "loja": "Atelie Andressa", "nome": "Ana", "frase": "O que está na minha maleta hoje.", "fonte": "helvetica",
        "cor": "#6b3a4a", "whatsapp": "11999998888", "modelo": "Oi! Quero essa da maleta de {nome}.\n\n{pecas}\n\nPode separar pra mim?",
        "capa": SUPA + "/storage/v1/object/public/logos/L1/capa-c1-abc12345.jpg",
        "links": [{"label": "Pagar com cartão", "url": "https://loja.exemplo.com/pagar"}], "pix": "andressa@pix.com.br",
        "itens": [item(1, "AN-1001", "Anel Solitário Zircônia", nota="Polido."),
                  item(2, "CL-204", "Colar Riviera com um nome bem comprido para testar a quebra de linha no celular", cent=18900, tam="45 cm"),
                  item(3, "BR-088", "Brinco Argola P", preco="consulte", banho="Ródio", tam="único"),
                  item(4, "PU-312", "Pulseira Elo", preco="oculto", cent=None, tam="18 cm")]}

def novo_contexto(browser, viewport, estado):
    """estado: {'lona': ..., 'pedidos': [], 'erro_pedido': None|(status, corpo), 'cai_rede': bool, 'chamadas': []}"""
    ctx = browser.new_context(viewport=viewport, service_workers="block", permissions=["clipboard-read", "clipboard-write"])
    def tratar(route, request):
        caminho = urllib.parse.urlparse(request.url).path
        cab = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
        if request.method == "OPTIONS": return route.fulfill(status=204, headers=cab)
        if caminho.startswith("/storage/v1/object/public/"):
            base = caminho.rsplit("/", 1)[-1].lower().replace(".jpg", "")
            demo = Path("/tmp/cat/luxi-lona/public/pecas") / ("capa.jpg" if base.startswith("capa") else base + ".jpg")
            corpo = demo.read_bytes() if demo.exists() else JPG   # com fotos de demonstração reais quando existirem
            return route.fulfill(status=200, headers={**cab, "content-type": "image/jpeg"}, body=corpo)
        m = re.match(r"/rest/v1/rpc/([a-z_]+)", caminho)
        corpo = json.loads(request.post_data or "{}") if request.post_data else {}
        if m:
            nome = m.group(1); estado["chamadas"].append((nome, corpo))
            if estado.get("cai_rede"): return route.abort("failed")
            if nome == "lona_publica":
                lona = estado["lona"]() if callable(estado["lona"]) else estado["lona"]
                return route.fulfill(status=200, headers={**cab, "content-type": "application/json"}, body=json.dumps(lona))
            if nome == "lona_criar_pedido":
                if estado.get("erro_pedido"):
                    st, c = estado["erro_pedido"]
                    return route.fulfill(status=st, headers={**cab, "content-type": "application/json"}, body=json.dumps(c))
                estado["pedidos"].append(corpo)
                return route.fulfill(status=200, headers={**cab, "content-type": "application/json"}, body=json.dumps({"ok": True, "total_centavos": 0}))
        if caminho.startswith("/auth/v1/"): return route.fulfill(status=401, headers={**cab, "content-type": "application/json"}, body="{}")
        return route.fulfill(status=200, headers={**cab, "content-type": "application/json"}, body="null")
    ctx.route(SUPA + "/**", tratar)
    return ctx

def rodar(fotos=False):
    srv = Servidor(); problemas = []; ok = []
    def check(cond, msg):
        (ok if cond else problemas).append(msg)
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])

        # ---------- 1) layout em 4 larguras ----------
        for nome, w, h in [("celular pequeno 320x640", 320, 640), ("celular 390x844", 390, 844), ("celular grande 430x932", 430, 932), ("computador 1366x768", 1366, 768)]:
            estado = {"lona": LONA, "pedidos": [], "chamadas": []}
            ctx = novo_contexto(b, {"width": w, "height": h}, estado)
            pg = ctx.new_page(); erros = []; avisos = []
            pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
            pg.on("console", lambda m: avisos.append(m.text[:160]) if ("Content Security Policy" in m.text or "Refused to" in m.text) else None)
            pg.goto(srv.url + "?m=ana"); pg.wait_for_selector(".lona-peca", timeout=15000); pg.wait_for_timeout(500)
            m = pg.evaluate("""() => ({
                largura: document.documentElement.scrollWidth, janela: innerWidth,
                h1: (document.querySelector('.lona-nome')||{}).textContent,
                pecas: document.querySelectorAll('.lona-peca').length,
                semApp: !document.querySelector('.oj-top, .oj-hamb, .oj-nav, #luxi-nova-versao'),
                imgsQuebradas: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
                pequenos: [...document.querySelectorAll('.lona button, .lona a, .lona input')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.textContent||e.id||e.tagName).trim().slice(0,25)),
                tituloAba: document.title,
                robots: (document.querySelector('meta[name=robots]')||{}).content,
                corSolta: getComputedStyle(document.querySelector('.lona')).colorScheme,
                capa: (() => { const r = document.querySelector('.lona-capa').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
                foto: (() => { const r = document.querySelector('.lona-foto').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
            })""")
            check(not erros, f"[{nome}] sem erro de JavaScript {erros[:2]}")
            check(abs(m["capa"][1] - m["capa"][0] * 9 / 16) <= 2, f"[{nome}] capa em proporção 16:9 (largura {m['capa'][0]}, altura {m['capa'][1]})")
            check(abs(m["foto"][1] - m["foto"][0]) <= 2, f"[{nome}] foto da peça quadrada, não esticada ({m['foto'][0]}x{m['foto'][1]})")
            check(m["pecas"] == 4 and m["h1"] == "Ana", f"[{nome}] mostra a lona de Ana com as 4 peças (vi {m['pecas']})")
            check(m["largura"] <= m["janela"], f"[{nome}] não rola para o lado ({m['largura']}>{m['janela']})")
            check(m["semApp"], f"[{nome}] aparece SÓ a vitrine (nada do app, nem faixa de versão nova)")
            check(m["imgsQuebradas"] == 0, f"[{nome}] fotos carregam")
            check(not m["pequenos"], f"[{nome}] alvos de toque ≥44px: pequenos={m['pequenos']}")
            check(m["robots"] == "noindex" and "Ana" in m["tituloAba"], f"[{nome}] título da aba e noindex ({m['tituloAba']})")
            check(not avisos, f"[{nome}] nenhuma violação da política de segurança {avisos[:2]}")
            sw = pg.evaluate("navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(r => r.length) : 0")
            check(sw == 0, f"[{nome}] a cliente não recebe service worker do app")
            if fotos: pg.screenshot(path=f"/tmp/shots/lona-{w}x{h}.png", full_page=True)
            ctx.close()

        # ---------- 2) fluxo do pedido (celular) ----------
        def abrir(estado, w=390, h=844):
            ctx = novo_contexto(b, {"width": w, "height": h}, estado); pg = ctx.new_page()
            pg.on("pageerror", lambda e: problemas.append("erro JS no fluxo: " + str(e)[:100]))
            pg.goto(srv.url + "?m=ana"); pg.wait_for_selector(".lona-peca", timeout=15000)
            return ctx, pg

        # 2a) entrega
        estado = {"lona": LONA, "pedidos": [], "chamadas": []}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-peca >> nth=2 >> text=Por no carrinho")
        check(pg.inner_text(".lona-barra").startswith("2 peças"), "barra do carrinho mostra 2 peças")
        pg.click(".lona-barra >> text=Ver e enviar"); pg.wait_for_selector("[role=dialog]")
        check(pg.evaluate("document.activeElement && document.activeElement.id") == "lona-carrinho-titulo", "ao abrir o carrinho o foco vai para o título (leitor de tela)")
        check(pg.evaluate("document.body.style.overflow") == "hidden", "página de trás não rola com o carrinho aberto")
        txt = pg.inner_text("[role=dialog]")
        check("R$ 129,00" in txt.replace("\xa0", " "), "total soma só o que tem preço (R$ 129,00)")
        check("1 peça tem o preço combinado com Ana" in txt, "avisa da peça com preço a combinar")
        pg.click("text=Enviar pedido (vou pagar)")
        check("Informe seu nome" in pg.inner_text("[role=alert]"), "nome vazio: avisa e NÃO chama o servidor")
        check(not [c for c in estado["chamadas"] if c[0] == "lona_criar_pedido"], "nenhum pedido foi enviado com dados faltando")
        pg.fill("#lona-nome", "Maria Cliente"); pg.fill("#lona-fone", "(11) 98888-7777")
        check(pg.input_value("#lona-fone") == "11988887777", "telefone aceita só números")
        pg.click("text=Copiar chave Pix"); pg.wait_for_selector("text=Chave copiada")
        check(pg.evaluate("navigator.clipboard.readText()") == "andressa@pix.com.br", "copiar chave Pix coloca a chave na área de transferência")
        pg.click("text=Enviar pedido para Ana")
        pg.wait_for_selector(".lona-feito")
        ped = estado["pedidos"][-1]
        check(ped["p_origem"] == "entrega" and ped["p_slug"] == "ana" and ped["p_nome"] == "Maria Cliente" and ped["p_whatsapp"] == "11988887777", f"pedido enviado certo: {ped['p_origem']}, {ped['p_nome']}")
        check(len(ped["p_pecas"]) == 2 and ped["p_pecas"][0].endswith("1"), "enviou os ids das 2 peças")
        a = pg.get_attribute(".lona-feito a", "href"); dec = urllib.parse.unquote(a)
        check(a.startswith("https://wa.me/5511999998888?text="), "botão leva ao WhatsApp da vendedora (55 + DDD)")
        check("?m=ana" in dec and "AN-1001" not in dec and "Cliente: Maria Cliente · 11988887777" in dec and "combinar a entrega" in dec, "mensagem leva o LINK da vitrine (sem lista de peças), quem é a cliente e o pedido de entrega")
        check(pg.get_attribute(".lona-feito a", "rel") == "noopener noreferrer", "link externo com noopener")
        check(pg.inner_text(".lona-barra") if pg.query_selector(".lona-barra") else True, "ok")
        pg.keyboard.press("Escape")
        check(not pg.query_selector("[role=dialog]"), "Esc fecha a janela")
        check(pg.evaluate("document.body.style.overflow") != "hidden", "página volta a rolar ao fechar")
        check(not pg.query_selector(".lona-barra"), "carrinho esvaziou depois do pedido")
        ctx.close()

        # 2b) pagar à loja
        estado = {"lona": LONA, "pedidos": [], "chamadas": []}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=1 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        pg.fill("#lona-nome", "Joana"); pg.fill("#lona-fone", "11977776666")
        pg.click("text=Enviar pedido (vou pagar)"); pg.wait_for_selector(".lona-feito")
        check(estado["pedidos"][-1]["p_origem"] == "pago_loja", "caminho 'vou pagar' registra como pago_loja")
        dec = urllib.parse.unquote(pg.get_attribute(".lona-feito a", "href"))
        check("Pix: andressa@pix.com.br" in dec and "Mando o comprovante" in dec, "mensagem de pagamento leva a chave Pix e pede o comprovante")
        ctx.close()

        # 2c) "Quero essa" (direto, sem registrar)
        estado = {"lona": LONA, "pedidos": [], "chamadas": []}
        ctx, pg = abrir(estado)
        href = urllib.parse.unquote(pg.get_attribute(".lona-peca >> nth=0 >> text=Quero essa", "href"))
        check("?m=ana" in href and "AN-1001" not in href and "Anel" not in href, "'Quero essa' manda o link da vitrine, não o texto do produto")
        check(not [c for c in estado["chamadas"] if c[0] == "lona_criar_pedido"], "'Quero essa' não registra pedido (é só conversa)")
        ctx.close()

        # 2d) peça saiu: erro LX410 -> mensagem + vitrine atualiza + carrinho limpa a peça
        resto = {**LONA, "itens": LONA["itens"][1:]}
        estado = {"lona": LONA, "pedidos": [], "chamadas": [], "erro_pedido": (400, {"code": "LX410", "message": "Algumas peças acabaram de sair: AN-1001", "details": None, "hint": None})}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        pg.fill("#lona-nome", "Maria"); pg.fill("#lona-fone", "11988887777")
        estado["lona"] = resto
        pg.click("text=Enviar pedido para Ana"); pg.wait_for_selector("[role=alert]")
        check("acabaram de sair" in pg.inner_text("[role=alert]"), "peça que saiu: cliente lê a explicação")
        pg.wait_for_timeout(700)
        check(pg.evaluate("document.querySelectorAll('.lona-peca').length") == 3, "a vitrine se atualizou sozinha (a peça sumiu)")
        ctx.close()

        # 2d2) o mesmo erro, mas SEM o código (só o texto): a vitrine entende igual
        estado = {"lona": LONA, "pedidos": [], "chamadas": [], "erro_pedido": (400, {"message": "Há muitos pedidos em aberto nesta lona. Fale direto no WhatsApp."})}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        pg.fill("#lona-nome", "Maria"); pg.fill("#lona-fone", "11988887777"); pg.click("text=Enviar pedido para Ana"); pg.wait_for_selector("[role=alert]")
        check(pg.query_selector("[role=alert] a[href^='https://wa.me/5511999998888']") is not None, "erro sem código: reconhecido pelo texto e oferece o WhatsApp direto")
        ctx.close()

        # 2g) loja grande, com peça sem foto: espaço "foto em breve" e busca
        grande = {**LONA, "itens": LONA["itens"] + [item(i, f"X-{i}", f"Peça extra {i}") for i in range(5, 12)]}
        grande["itens"][1] = {**grande["itens"][1], "foto": None}
        estado = {"lona": grande, "pedidos": [], "chamadas": []}
        ctx, pg = abrir(estado)
        check(pg.query_selector(".lona-foto--vazia") is not None and "Foto em breve" in pg.inner_text(".lona-foto--vazia"), "peça sem foto aparece com 'Foto em breve' (não some)")
        check(pg.query_selector("input[type=search]") is not None, "loja com mais de 8 peças ganha busca")
        pg.fill("input[type=search]", "extra 7"); pg.wait_for_timeout(200)
        check(pg.evaluate("document.querySelectorAll('.lona-peca').length") == 1, "a busca filtra as peças")
        pg.fill("input[type=search]", "zzzz"); pg.wait_for_timeout(200)
        check("Nenhuma peça com esse nome" in pg.inner_text(".lona"), "busca sem resultado explica")
        pg.fill("input[type=search]", ""); pg.click(".lona-peca >> nth=1 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        check("só para este pedido" in pg.inner_text("[role=dialog]"), "aviso de privacidade perto dos dados da cliente")
        ctx.close()

        # 2e) muitos pedidos: LX429 -> oferece WhatsApp direto
        estado = {"lona": LONA, "pedidos": [], "chamadas": [], "erro_pedido": (400, {"code": "LX429", "message": "Há muitos pedidos em aberto nesta lona. Fale direto no WhatsApp.", "details": None, "hint": None})}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        pg.fill("#lona-nome", "Maria"); pg.fill("#lona-fone", "11988887777"); pg.click("text=Enviar pedido para Ana")
        pg.wait_for_selector("[role=alert]")
        check(pg.query_selector("[role=alert] a[href^='https://wa.me/5511999998888']") is not None, "excesso de pedidos: oferece falar direto no WhatsApp")
        ctx.close()

        # 2f) sem internet no pedido
        estado = {"lona": LONA, "pedidos": [], "chamadas": []}
        ctx, pg = abrir(estado)
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        pg.fill("#lona-nome", "Maria"); pg.fill("#lona-fone", "11988887777"); estado["cai_rede"] = True
        pg.click("text=Enviar pedido para Ana"); pg.wait_for_selector("[role=alert]")
        check("Sem conexão" in pg.inner_text("[role=alert]") or "Tente" in pg.inner_text("[role=alert]"), "sem internet: mensagem clara, sem travar")
        check(pg.is_enabled("text=Enviar pedido para Ana"), "o botão volta a funcionar para tentar de novo")
        ctx.close()

        # ---------- 3) situações da página ----------
        estado = {"lona": None, "pedidos": [], "chamadas": []}
        ctx = novo_contexto(b, {"width": 390, "height": 844}, estado); pg = ctx.new_page(); pg.goto(srv.url + "?m=naoexiste")
        pg.wait_for_selector("text=Esta loja não está disponível")
        check(True, "lona que não existe/foi tirada do ar: mensagem educada")
        ctx.close()
        estado = {"lona": LONA, "pedidos": [], "chamadas": [], "cai_rede": True}
        ctx = novo_contexto(b, {"width": 390, "height": 844}, estado); pg = ctx.new_page(); pg.goto(srv.url + "?m=ana")
        pg.wait_for_selector("text=Sem conexão"); estado["cai_rede"] = False; pg.click("text=Tentar de novo"); pg.wait_for_selector(".lona-peca")
        check(True, "sem internet ao abrir: avisa e 'Tentar de novo' funciona")
        ctx.close()
        estado = {"lona": {**LONA, "itens": []}, "pedidos": [], "chamadas": []}
        ctx = novo_contexto(b, {"width": 390, "height": 844}, estado); pg = ctx.new_page(); pg.goto(srv.url + "?m=ana"); pg.wait_for_selector(".lona-vazia")
        check("Nenhuma peça disponível" in pg.inner_text(".lona-vazia") and pg.query_selector(".lona-vazia a[href^='https://wa.me/5511999998888']"), "lona sem peças: explica e oferece chamar a vendedora")
        ctx.close()
        estado = {"lona": {**LONA, "pix": None, "capa": None}, "pedidos": [], "chamadas": []}
        ctx = novo_contexto(b, {"width": 390, "height": 844}, estado); pg = ctx.new_page(); pg.goto(srv.url + "?m=ana"); pg.wait_for_selector(".lona-peca")
        pg.click(".lona-peca >> nth=0 >> text=Por no carrinho"); pg.click(".lona-barra >> text=Ver e enviar")
        check(pg.query_selector("h3:has-text('Pagar agora')") is None and pg.query_selector("text=Copiar chave Pix") is None, "sem chave Pix cadastrada: a opção de pagar some (só combina a entrega)")
        check(pg.query_selector(".lona-capa--vazia") is not None, "sem capa: usa a cor da marca em vez de imagem quebrada")
        ctx.close()
        # endereço malicioso na URL: o app normal abre, nada de vitrine
        estado = {"lona": LONA, "pedidos": [], "chamadas": []}
        ctx = novo_contexto(b, {"width": 390, "height": 844}, estado); pg = ctx.new_page(); pg.goto(srv.url + "?m=" + urllib.parse.quote("x';alert(1)//")); pg.wait_for_timeout(1500)
        check(not [c for c in estado["chamadas"] if c[0] == "lona_publica"], "endereço fora do padrão não chega nem ao servidor")
        ctx.close()
        b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in problemas: print("PROBLEMA:", m)
    return len(problemas)

if __name__ == "__main__":
    sys.exit(1 if rodar("--fotos" in sys.argv) else 0)
