"""Tela da lona DENTRO do app (dona e consultora), em navegador real. Servidor simulado, nenhum dado real.
Cobre: abrir, editar, salvar sozinho, publicar, prévia, pedidos (confirmar/cancelar), papel da consultora,
modo leitura, celular sem rolar de lado, alvos de toque, e que o resto do app segue abrindo.
Uso: python3 tests/navegador/lona_editor.py [--fotos]"""
import sys, json, re, base64, time, urllib.parse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, SUPA, USUARIO, CHAVE_SESSAO, loja_padrao, esperar_app
from playwright.sync_api import sync_playwright

JPG = base64.b64decode("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=")
FOTO = SUPA + "/storage/v1/object/public/fotos-pecas/L1/a.jpg"
LONA_ID = "11111111-1111-4111-8111-111111111111"

def montar_lojas(papel):
    t = loja_padrao(0)
    mk = lambda i, cod, nome, qtd=3, fotos=None, venda=6900: {"id": f"p{i}", "loja_id": "L1", "codigo": cod, "nome": nome, "qtd": qtd,
        "custo_centavos": 2500, "venda_centavos": venda, "banho": "Ouro 18k", "tamanho": "aro 16", "fotos": [FOTO] if fotos is None else fotos,
        "entrada_em": "2026-09-20T00:00:00Z", "arquivada": False}
    t["pecas"] = [mk(1, "AN-1", "Anel Solitário"), mk(2, "CL-2", "Colar Riviera", venda=18900), mk(3, "BR-3", "Brinco sem foto web", fotos=["data:image/jpeg;base64,AAAA"]), mk(4, "PU-4", "Pulseira esgotada", qtd=0)]
    t["consultoras"] = [{"id": "c1", "loja_id": "L1", "nome": "Dona", "eh_dona": True, "ativa": True, "comissao": 0},
                        {"id": "c2", "loja_id": "L1", "nome": "Bia", "eh_dona": False, "ativa": True, "comissao": 20, "usuario_id": "u1" if papel == "consultora" else "u9"}]
    if papel == "consultora":
        t["consultoras"][0]["usuario_id"] = "u9"; t["lojas"][0]["dona_id"] = "u9"
    return t

def contexto(browser, vp, papel, st):
    ctx = browser.new_context(viewport=vp, service_workers="block")
    sessao = {"access_token": "a.b.c", "refresh_token": "r", "token_type": "bearer", "expires_at": int(time.time()) + 3600, "expires_in": 3600, "user": USUARIO}
    ctx.add_init_script(f"localStorage.setItem('{CHAVE_SESSAO}', {json.dumps(json.dumps(sessao))});")
    tabelas = montar_lojas(papel)
    tabelas['lojas'][0]['whatsapp'] = st.get('whatsapp_loja', '')
    def tratar(route, request):
        caminho = urllib.parse.urlparse(request.url).path
        cab = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
        def j(c, s=200): route.fulfill(status=s, headers={**cab, "content-type": "application/json"}, body=json.dumps(c))
        if request.method == "OPTIONS": return route.fulfill(status=204, headers=cab)
        if caminho.startswith("/storage/v1/object/public/"): return route.fulfill(status=200, headers={**cab, "content-type": "image/jpeg"}, body=JPG)
        if caminho.startswith("/storage/v1/object/") and request.method == "POST":
            st["envios"].append(caminho); return j({"Key": caminho})
        if caminho.startswith("/auth/v1/user"): return j(USUARIO)
        if caminho.startswith("/auth/v1/"): return j({})
        m = re.match(r"/rest/v1/rpc/([a-z_]+)", caminho)
        if m:
            n = m.group(1); corpo = json.loads(request.post_data or "{}") if request.post_data else {}
            st["rpc"].append((n, corpo))
            if n in st["falha"]: return j({"code": "LX403", "message": st["falha"][n], "details": None, "hint": None}, 400)
            if n == "sou_admin_luxi": return j(False)
            if n == "lona_resumo": return j(st["resumo"])
            if n == "lona_minha": return j(st["lona"])
            if n == "lona_salvar":
                st["lona"]["rascunho"] = corpo["p_rascunho"]; return j(corpo["p_rascunho"])
            if n == "lona_publicar":
                st["lona"]["publicado"] = st["lona"]["rascunho"]; st["lona"]["publicado_em"] = "2026-10-03T12:00:00Z"
                st["resumo"][0]["publicada"] = True; return j({"slug": st["lona"]["slug"]})
            if n == "lona_tirar_do_ar": st["lona"]["publicado"] = None; return j(None)
            if n == "lona_salvar_pix": st["lona"]["pix_chave"] = corpo["p_chave"]; return j(None)
            if n == "lona_pedidos_listar": return j(st["pedidos"])
            if n == "lona_confirmar_pedido":
                for p in st["pedidos"]:
                    if p["id"] == corpo["p_pedido"]: p["status"] = "confirmado"
                return j({"ok": True})
            if n == "lona_cancelar_pedido":
                for p in st["pedidos"]:
                    if p["id"] == corpo["p_pedido"]: p["status"] = "cancelado"
                return j(None)
            return j(None)
        m = re.match(r"/rest/v1/([a-z_]+)", caminho)
        if m:
            if request.method in ("POST", "PATCH", "DELETE"): return route.fulfill(status=201, headers=cab, body="")
            q = request.url
            if papel == "consultora" and m.group(1) == "lojas" and "dona_id=eq" in q: return j([])
            if m.group(1) == "consultoras" and "usuario_id=eq" in q: return j([c for c in tabelas["consultoras"] if c.get("usuario_id") == "u1"] if papel == "consultora" else [])
            return j(tabelas.get(m.group(1), []))
        return j(None)
    ctx.route(SUPA + "/**", tratar)
    return ctx

def novo_estado(papel="dona", pode_editar=True):
    pedidos = [
        {"id": "o1", "consultora_id": "c1", "consultora_nome": "Dona", "cliente_nome": "Maria Cliente", "cliente_whatsapp": "11988887777", "origem": "pago_loja", "status": "pago",
         "total_centavos": 6900, "criado_em": "2026-10-02T15:00:00Z", "reserva_ativa": True,
         "itens": [{"id": "i1", "peca_id": "p1", "codigo": "AN-1", "nome": "Anel Solitário", "preco_centavos": 6900, "preco_loja_centavos": 6900, "estoque_ok": True}]},
        {"id": "o2", "consultora_id": "c1", "consultora_nome": "Dona", "cliente_nome": "Joana", "cliente_whatsapp": "11977776666", "origem": "entrega", "status": "aberto",
         "total_centavos": 0, "criado_em": "2026-10-03T09:00:00Z", "reserva_ativa": True,
         "itens": [{"id": "i2", "peca_id": "p2", "codigo": "CL-2", "nome": "Colar Riviera", "preco_centavos": None, "preco_loja_centavos": 18900, "estoque_ok": True}]},
        {"id": "o3", "consultora_id": "c1", "consultora_nome": "Dona", "cliente_nome": "Sem Estoque", "cliente_whatsapp": "11966665555", "origem": "entrega", "status": "aberto",
         "total_centavos": 0, "criado_em": "2026-10-03T10:00:00Z", "reserva_ativa": True,
         "itens": [{"id": "i3", "peca_id": "p4", "codigo": "PU-4", "nome": "Pulseira esgotada", "preco_centavos": None, "preco_loja_centavos": 7000, "estoque_ok": False}]},
    ]
    cid = "c2" if papel == "consultora" else "c1"
    return {"rpc": [], "envios": [], "falha": {}, "pedidos": pedidos,
            "resumo": [{"consultora_id": cid, "nome": "Bia" if papel == "consultora" else "Dona", "eh_dona": papel != "consultora", "slug": "dona-teste", "publicada": False, "abertos": 3}] +
                      ([{"consultora_id": "c2", "nome": "Bia", "eh_dona": False, "slug": None, "publicada": False, "abertos": 0}] if papel != "consultora" else []),
            "lona": {"id": LONA_ID, "slug": "dona-teste", "consultora_id": cid, "consultora_nome": "Bia" if papel == "consultora" else "Dona",
                     "eh_dona": papel != "consultora", "rascunho": {"nome": "Dona", "frase": "", "fonte": "helvetica", "cor": "#1a1a1a", "whatsapp": "", "modelo": "Oi {nome} {pecas}",
                     "capa": None, "links": [], "ordem": [], "itens": {}}, "publicado": None, "publicado_em": None, "pix_chave": None, "loja_nome": "Loja X", "pode_editar": pode_editar}}

def abrir_lona(pg):
    esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(250)
    pg.click("nav.oj-lateral >> text=Editar loja e pedidos")
    pg.wait_for_selector(".lona-ed")

def rodar(fotos=False):
    srv = Servidor(); prob = []; ok = []
    def check(c, m): (ok if c else prob).append(m)
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        # ---- A) dona: ciclo completo ----
        st = novo_estado("dona"); ctx = contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
        pg.goto(srv.url); abrir_lona(pg)
        check("fora do ar" in pg.inner_text(".lona-ed").lower(), "dona abre a lona: começa 'Fora do ar'")
        check(pg.query_selector("button.oj-chip:has-text('Bia')") is not None, "dona vê as consultoras para escolher de quem é a lona")
        pg.fill("#ln-nome", "Dona da Loja"); pg.fill("#ln-zap", "(11) 99999-8888")
        check(pg.input_value("#ln-zap") == "11999998888", "WhatsApp aceita só números")
        pg.wait_for_timeout(1400)
        sv = [c for c in st["rpc"] if c[0] == "lona_salvar"]
        check(len(sv) >= 1 and sv[-1][1]["p_rascunho"]["nome"] == "Dona da Loja", "rascunho salva sozinho, sem apertar nada")
        check("Rascunho salvo" in pg.inner_text(".lona-ed"), "mostra 'Rascunho salvo'")
        # peças: só entram as que têm foto da web e estoque
        bt = lambda nome: pg.query_selector(f"button[aria-label='Incluir {nome}']")
        check(bt("Anel Solitário").is_enabled() and bt("Colar Riviera").is_enabled(), "peças com foto e estoque podem entrar")
        check(bt("Brinco sem foto web").is_enabled() and "sem foto" in pg.inner_text(".lona-ed").lower(), "peça sem foto pode entrar (aparece como 'foto em breve'), e o app avisa")
        check(not bt("Pulseira esgotada").is_enabled(), "peça sem estoque é bloqueada")
        bt("Colar Riviera").click(); bt("Anel Solitário").click()
        pg.wait_for_selector("#pv-p1")
        check(pg.input_value("#pv-p2") == "189,00", "preço começa no preço da loja (189,00)")
        pg.fill("#pv-p2", "150,00"); pg.press("#pv-p2", "Tab"); pg.wait_for_timeout(200)
        check(pg.input_value("#pv-p2") == "189,00", "preço abaixo do da loja volta para o piso")
        pg.fill("#pv-p2", "199,90"); pg.press("#pv-p2", "Tab"); pg.wait_for_timeout(200)
        check(pg.input_value("#pv-p2") == "199,90", "preço acima do da loja é aceito")
        pg.click("button[aria-label='Subir Anel Solitário']"); pg.wait_for_timeout(1300)
        ult = [c for c in st["rpc"] if c[0] == "lona_salvar"][-1][1]["p_rascunho"]
        check(ult["ordem"] == ["p1", "p2"] and ult["itens"]["p2"]["centavos"] == 19990, f"ordem e preço chegam ao servidor: {ult['ordem']} / {ult['itens']['p2']['centavos']}")
        # publicar
        pg.click("button:has-text('Publicar lona')"); pg.wait_for_selector("text=Lona publicada")
        check("no ar" in pg.inner_text(".oj-estado").lower(), "depois de publicar fica 'No ar'")
        link = pg.inner_text(".lona-ed-link")
        check(re.search(r"\?m=dona-teste$", link) is not None, f"link no padrão ?m=apelido: {link}")
        check(pg.is_disabled("button:has-text('Publicar mudanças')"), "sem mudanças, 'Publicar mudanças' fica desligado")
        pg.fill("#ln-frase", "Novidades da semana"); pg.wait_for_timeout(300)
        check(pg.is_enabled("button:has-text('Publicar mudanças')") and "com mudanças" in pg.inner_text(".oj-estado").lower(), "editar depois de publicar avisa que há mudanças não publicadas")
        pg.wait_for_timeout(1200)
        # prévia
        pg.click("button:has-text('Ver como a cliente vê')"); pg.wait_for_selector(".lona--previa .lona-peca")
        pv = pg.inner_text(".lona--previa")
        check("Prévia" in pv and "Colar Riviera" in pv and "R$ 199,90" in pv.replace("\xa0", " ") and "Novidades da semana" in pv, "prévia mostra o rascunho como a cliente verá")
        check(pg.query_selector(".lona--previa .lona-carrinho-btn") is None, "na prévia não há carrinho (pedidos desligados)")
        pg.click("button:has-text('Esconder prévia')")
        # Pix só a dona
        pg.fill("#ln-pix", "loja@pix.com"); pg.click("button:has-text('Salvar chave')"); pg.wait_for_selector("text=Chave Pix salva")
        check(any(c[0] == "lona_salvar_pix" and c[1]["p_chave"] == "loja@pix.com" for c in st["rpc"]), "dona salva a chave Pix")
        # links: só https
        pg.fill("#lu-0", "https://loja.com/pagar"); pg.fill("#ll-0", "Cartão"); pg.wait_for_timeout(1300)
        check([c for c in st["rpc"] if c[0] == "lona_salvar"][-1][1]["p_rascunho"]["links"] == [{"label": "Cartão", "url": "https://loja.com/pagar"}], "link entra no rascunho")
        # tirar do ar com confirmação
        pg.click("button:has-text('Tirar do ar')"); check(pg.query_selector("button:has-text('Sim, tirar do ar')") is not None, "tirar do ar pede confirmação")
        pg.click("button:has-text('Sim, tirar do ar')"); pg.wait_for_function("document.querySelector('.oj-estado').textContent.trim().toLowerCase() === 'fora do ar'")
        check(st["lona"]["publicado"] is None, "lona saiu do ar")
        # pedidos
        pg.click("[role=tab]:has-text('Pedidos')"); pg.wait_for_selector("text=Maria Cliente")
        txt = pg.inner_text(".lona-ed-pedidos")
        check("avisou que pagou" in txt.lower() and "entrega a combinar" in txt.lower(), "pedidos com o estado certo")
        check("confira o comprovante" in txt, "pedido 'vou pagar' lembra de conferir o comprovante")
        check(pg.query_selector(".oj-card:has-text('Sem Estoque') button:has-text('Confirmar venda')").is_disabled(), "pedido com peça sem estoque não deixa confirmar")
        check(pg.get_attribute(".oj-card:has-text('Maria Cliente') a:has-text('WhatsApp')", "href").startswith("https://wa.me/5511988887777"), "atalho para chamar a cliente no WhatsApp")
        pg.click(".oj-card:has-text('Joana') button:has-text('Confirmar venda')")
        check(pg.input_value("#cv-i2") == "189,00", "valor da peça 'a combinar' começa no preço da loja")
        pg.fill("#cv-i2", "180,00"); pg.click("button:has-text('Registrar venda')"); pg.wait_for_selector("text=Venda registrada")
        conf = [c for c in st["rpc"] if c[0] == "lona_confirmar_pedido"][-1][1]
        check(conf["p_pedido"] == "o2" and conf["p_valores"] == {"i2": 18000}, f"confirmação envia o valor combinado em centavos {conf['p_valores']}")
        pg.click(".oj-card:has-text('Maria Cliente') button:has-text('Cancelar pedido')"); pg.click("button:has-text('Sim, cancelar')"); pg.wait_for_selector("text=Pedido cancelado")
        check(any(c[0] == "lona_cancelar_pedido" and c[1]["p_pedido"] == "o1" for c in st["rpc"]), "cancelar pede confirmação e cancela")
        m = pg.evaluate("({l: document.documentElement.scrollWidth, j: innerWidth, peq: [...document.querySelectorAll('.lona-ed button, .lona-ed a, .lona-ed input:not([type=file]):not([type=checkbox]):not([type=color]), .lona-ed select')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && r.height<43.5 && !e.classList.contains('oj-link-sutil');}).map(e => (e.textContent||e.id||e.type).trim().slice(0,20))})")
        check(m["l"] <= m["j"], f"celular: não rola para o lado ({m['l']}>{m['j']})")
        check(not m["peq"], f"celular: alvos de toque ≥44px, pequenos={m['peq']}")
        check(not erros, f"sem erro de JavaScript {erros[:2]}")
        if fotos: pg.screenshot(path="/tmp/shots/editor-dona.png", full_page=True)
        ctx.close()

        # ---- B) consultora ----
        st = novo_estado("consultora"); ctx = contexto(b, {"width": 390, "height": 844}, "consultora", st); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:120])); pg.goto(srv.url); abrir_lona(pg)
        check(pg.query_selector("button.oj-chip:has-text('Dona')") is None, "consultora não vê a lona das outras")
        check(pg.query_selector("#ln-pix") is None and "Só a dona da loja altera" in pg.inner_text(".lona-ed"), "consultora NÃO edita a chave Pix (só vê)")
        check(any(c[0] == "lona_minha" and c[1]["p_consultora"] == "c2" for c in st["rpc"]), "abre a lona da própria consultora")
        check(not erros, f"consultora: sem erro de JavaScript {erros[:2]}")
        ctx.close()

        # ---- C) plano em modo leitura ----
        st = novo_estado("dona", pode_editar=False); ctx = contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_lona(pg)
        check("modo leitura" in pg.inner_text(".lona-ed") and pg.is_disabled("#ln-nome") and pg.query_selector("button:has-text('Publicar lona')") is None, "plano vencido: só leitura, sem publicar")
        ctx.close()

        # ---- D) erro do servidor ao publicar ----
        st = novo_estado("dona"); st["falha"]["lona_publicar"] = "Informe seu WhatsApp (com DDD) para publicar"
        ctx = contexto(b, {"width": 390, "height": 844}, "dona", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_lona(pg)
        pg.click("button:has-text('Publicar lona')"); pg.wait_for_selector("[role=alert]")
        check("WhatsApp" in pg.inner_text("[role=alert]") and "fora do ar" in pg.inner_text(".lona-ed").lower(), "erro ao publicar aparece em português e a lona segue fora do ar")
        ctx.close()

        # ---- E) o resto do app continua abrindo; celular pequeno ----
        st = novo_estado("dona"); ctx = contexto(b, {"width": 320, "height": 640}, "dona", st); pg = ctx.new_page(); pg.goto(srv.url); abrir_lona(pg)
        check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), "320px: não rola para o lado")
        pg.click(".oj-hamb"); pg.click("nav.oj-lateral >> text=Loja on-line"); pg.wait_for_timeout(700)
        check(pg.query_selector(".oj-vazio, .oj-card") is not None, "Loja on-line abre")
        ctx.close(); b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in prob: print("PROBLEMA:", m)
    return len(prob)

if __name__ == "__main__":
    sys.exit(1 if rodar("--fotos" in sys.argv) else 0)
