"""Cobrança: tela "Seu período de teste terminou" -> pagamento seguro (Stripe) em NAVEGADOR REAL.
Servidor e Stripe simulados; nada real é cobrado. Cobre: teste vencido, mensal e anual, preço mostrado, o que é enviado ao servidor,
reserva (pagamento ainda não ativado -> atendimento), erro da Stripe, volta do pagamento confirmando sozinha, carência de atraso e
"Gerenciar assinatura". Uso: python3 tests/navegador/pagamento.py"""
import sys, json, time
from pathlib import Path
from datetime import datetime, timedelta, timezone
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, esperar_app
import lona_editor as le
from playwright.sync_api import sync_playwright

def iso(dias): return (datetime.now(timezone.utc) + timedelta(days=dias)).strftime("%Y-%m-%dT%H:%M:%SZ")

def abrir(b, srv, ass, fn=None, caminho="", vp=(390, 900)):
    st = le.novo_estado("dona"); st["fn"] = fn or {}
    ctx = le.contexto(b, {"width": vp[0], "height": vp[1]}, "dona", st)
    st["tabelas"]["assinaturas"] = [{"loja_id": "L1", "plano": "crescimento", **ass}]
    for url, corpo in (("https://checkout.stripe.com/**", "<html><title>STRIPE</title><body>pagamento seguro</body></html>"),
                       ("https://billing.stripe.com/**", "<html><title>PORTAL</title><body>portal</body></html>"),
                       ("https://wa.me/**", "<html><title>WA</title><body>whatsapp</body></html>")):
        ctx.route(url, lambda route, request, c=corpo: route.fulfill(status=200, content_type="text/html", body=c))
    pg = ctx.new_page(); erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
    pg.goto(srv.url + caminho)
    return ctx, pg, st, erros

def abrir_conta(pg):
    """Minha conta fica dentro do grupo "Conta" do menu (que começa recolhido)."""
    if not pg.locator("nav.oj-lateral >> text=Minha conta").first.is_visible():
        pg.locator("nav.oj-lateral button:has-text('Conta')").first.click(); pg.wait_for_timeout(250)
    pg.locator("nav.oj-lateral >> text=Minha conta").first.click()

def rodar():
    srv = Servidor(); prob = []; ok = []
    def check(c, m): (ok if c else prob).append(m)
    VENCIDO = {"status": "trial", "trial_ate": iso(-1)}
    URL_OK = (200, {"url": "https://checkout.stripe.com/c/pay/cs_test_123"})
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])

        # ---- A) teste vencido: planos e botão ----
        ctx, pg, st, erros = abrir(b, srv, VENCIDO, {"stripe-assinar": URL_OK})
        pg.wait_for_selector("text=Seu período de teste terminou")
        txt = pg.inner_text("body")
        check("Assinar Solo · R$ 69,90/mês" in txt and "Assinar Equipe · R$ 129,90/mês" in txt, "mostra Solo R$ 69,90 e Equipe R$ 129,90 por mês")
        check("Assinar Escala" not in txt and "Assinar Visão" not in txt and "Assinar Solo (legado)" not in txt, "planos “em breve” e o legado NÃO têm botão de assinar")
        pg.click("button:has-text('Assinar Solo')"); pg.wait_for_url("https://checkout.stripe.com/**", timeout=8000)
        corpo = [c for c in st["chamadas_fn"] if c[0] == "stripe-assinar"][-1][1]
        check(corpo == {"plano": "inicio", "periodo": "mensal"}, f"envia só plano e período (o preço NÃO vai do navegador): {corpo}")
        check("pagamento seguro" in pg.inner_text("body"), "o navegador vai para a página de pagamento da Stripe")
        ctx.close()

        # ---- B) anual ----
        ctx, pg, st, erros = abrir(b, srv, VENCIDO, {"stripe-assinar": URL_OK})
        pg.wait_for_selector("text=Seu período de teste terminou"); pg.click("button:has-text('Anual')")
        check("Assinar Equipe · R$ 1.480,86/ano" in pg.inner_text("body"), "anual mostra R$ 1.480,86/ano (5% off)")
        pg.click("button:has-text('Assinar Equipe')"); pg.wait_for_url("https://checkout.stripe.com/**", timeout=8000)
        check([c for c in st["chamadas_fn"]][-1][1] == {"plano": "crescimento", "periodo": "anual"}, "anual envia crescimento + anual")
        ctx.close()

        # ---- C) pagamento on-line ainda não ativado: reserva = atendimento ----
        ctx, pg, st, erros = abrir(b, srv, VENCIDO, {"stripe-assinar": (503, {"codigo": "nao_configurado", "mensagem": "O pagamento on-line ainda não está ativo."})})
        pg.wait_for_selector("text=Seu período de teste terminou"); pg.click("button:has-text('Assinar Solo')")
        pg.wait_for_url("https://wa.me/**", timeout=8000)
        check("Quero+assinar+o+plano+Solo" in pg.url or "Quero%20assinar%20o%20plano%20Solo" in pg.url, "sem Stripe ativa, cai no atendimento com o plano na mensagem (ninguém fica sem caminho)")
        ctx.close()

        # ---- D) erro da Stripe: mensagem clara, fica na tela ----
        ctx, pg, st, erros = abrir(b, srv, VENCIDO, {"stripe-assinar": (502, {"codigo": "stripe", "mensagem": "Não consegui abrir o pagamento agora. Tente de novo em instantes."})})
        pg.wait_for_selector("text=Seu período de teste terminou"); pg.click("button:has-text('Assinar Solo')"); pg.wait_for_selector("[role=alert]")
        check("Tente de novo" in pg.inner_text("[role=alert]") and "stripe" not in pg.url.lower(), "erro da Stripe: mensagem em português e continua na tela")
        check(pg.is_enabled("button:has-text('Assinar Solo')"), "o botão volta a funcionar para tentar de novo")
        ctx.close()

        # ---- E) volta do pagamento: libera sozinha ----
        contagem = {"n": 0}
        ctx, pg, st, erros = abrir(b, srv, VENCIDO, {}, caminho="?pagamento=ok")
        pg.wait_for_selector("text=Seu período de teste terminou")
        check("Estamos confirmando" in pg.inner_text("body"), "ao voltar do pagamento, avisa que está confirmando")
        st["tabelas"]["assinaturas"] = [{"loja_id": "L1", "plano": "inicio", "status": "ativa", "gateway": "stripe", "trial_ate": iso(-1)}]   # o webhook da Stripe ativou
        pg.wait_for_selector(".oj-hamb, .oj-atalho", timeout=15000)
        check("pagamento=" not in pg.url, f"o ?pagamento=ok some do endereço depois de liberar ({pg.url[-30:]})")
        check(pg.query_selector("text=Seu período de teste terminou") is None, "a loja abre sozinha, sem a pessoa fazer nada")
        ctx.close()

        # ---- F) carência de atraso ----
        ctx, pg, st, erros = abrir(b, srv, {"status": "atrasada", "atraso_desde": iso(-3), "trial_ate": iso(-30), "gateway": "stripe"}, {})
        pg.wait_for_selector(".oj-hamb, .oj-atalho", timeout=15000)
        check(pg.query_selector("text=Seu período de teste terminou") is None, "atrasada há 3 dias: continua usando (carência)")
        ctx.close()
        ctx, pg, st, erros = abrir(b, srv, {"status": "atrasada", "atraso_desde": iso(-16), "trial_ate": iso(-60), "gateway": "stripe"}, {})
        pg.wait_for_selector("text=Seu período de teste terminou", timeout=15000)
        check(True, "atrasada há 16 dias: acesso pausado (volta ao pagar)")
        ctx.close()

        # ---- G) gerenciar assinatura ----
        ctx, pg, st, erros = abrir(b, srv, {"status": "ativa", "gateway": "stripe", "gateway_cliente": "cus_1", "trial_ate": iso(-5)}, {"stripe-portal": (200, {"url": "https://billing.stripe.com/p/session/test"})})
        esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(300)
        abrir_conta(pg)
        pg.wait_for_selector("text=Gerenciar assinatura", timeout=8000)
        pg.click("button:has-text('Gerenciar assinatura')"); pg.wait_for_url("https://billing.stripe.com/**", timeout=8000)
        check(True, "“Gerenciar assinatura” leva à área segura da Stripe (cartão, faturas, cancelar)")
        ctx.close()
        ctx, pg, st, erros = abrir(b, srv, {"status": "trial", "trial_ate": iso(2)}, {})
        esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(300)
        abrir_conta(pg)
        pg.wait_for_timeout(800)
        check(pg.query_selector("button:has-text('Gerenciar assinatura')") is None, "quem ainda está no teste não vê “Gerenciar assinatura”")
        ctx.close()
        b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in prob: print("PROBLEMA:", m)
    return len(prob)

if __name__ == "__main__":
    sys.exit(1 if rodar() else 0)
