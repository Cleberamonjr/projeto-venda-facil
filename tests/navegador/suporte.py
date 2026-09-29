"""Tela de suporte da administradora em NAVEGADOR REAL: cabe no computador e no celular, sem rolar para o lado."""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
from playwright.sync_api import sync_playwright

AGORA = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600))
USO = {"resumo": {"lojas": 2, "usando_7d": 1, "pecas": 5, "vendas_30d": 2, "valor_vendas_30d": 118, "romaneios_30d": 1, "beta": 1, "pagantes": 0},
       "lojas": [{"id": "l2", "nome": "Atelie Andressa", "dona_email": "and@x.com", "situacao": "beta", "plano": "crescimento", "pecas": 2, "vendas_total": 2, "vendas_30d": 2, "romaneios_30d": 1, "consultoras": 1, "dias_restantes": 10, "ultima_atividade": AGORA}]}
def evento(i):
    tipos = [("venda", "Anel solitário", "AN-1", 1, 6900, "Maria"), ("peca", "Brinco argola de ouro rosé com pedra", "BR-2", 2, 4900, "Del Rey Semijoias"), ("romaneio", None, None, 12, 90000, "Prata Fina"), ("despesa", "Embalagens", None, None, 5000, "variavel"), ("baixa", "Colar", "CO-3", 1, 3000, "defeito"), ("cliente", "Maria da Conceição Oliveira", None, None, None, None)]
    t = tipos[i % len(tipos)]
    return {"quando": AGORA, "tipo": t[0], "nome": t[1], "codigo": t[2], "qtd": t[3], "valor": t[4], "extra": t[5]}
LOJA = {"loja": {"id": "l2", "nome": "Atelie Andressa com um nome bem comprido para testar quebra de linha", "whatsapp": "5511999990001"},
        "dona": {"email": "andressa.com.um.email.bem.comprido@exemplo.com.br", "ultimo_login": AGORA, "conta_criada": "2026-09-12T00:00:00Z"},
        "assinatura": {"plano": "crescimento", "status": "trial", "trial_ate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 864000))},
        "resumo": {"pecas": 40, "unidades": 120, "vendas_total": 30, "vendas_30d": 12, "valor_30d": 1234567, "a_receber": 456700, "clientes": 20, "consultoras": 3, "romaneios": 4, "ultima_atividade": AGORA},
        "atividade": [evento(i) for i in range(40)],
        "dias": [{"dia": f"2026-09-{d:02d}", "n": (d * 7) % 5} for d in range(1, 31)],
        "pecas": [{"id": f"p{i}", "codigo": f"AN-{i}", "nome": f"Peça de teste número {i} com nome longo", "qtd": 3, "custo_centavos": 2500, "venda_centavos": 6900, "banho": "Ouro 18k", "fornecedor": "Prata Fina", "tem_foto": False} for i in range(30)],
        "vendas": [], "clientes": [], "despesas": [], "consultoras": [], "entradas": []}

def rodar(fotos=False):
    srv = Servidor(); problemas = []
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        for nome, w, h in [("computador 1366x768", 1366, 768), ("celular 390x844", 390, 844)]:
            ctx, _ = preparar_contexto(b, {"width": w, "height": h}, rpc={"sou_admin_luxi": True, "uso_lojas_luxi": USO, "admin_ver_loja": LOJA})
            pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:100]))
            pg.goto(srv.url); esperar_app(pg)
            pg.click(".oj-hamb"); pg.wait_for_timeout(300); pg.click("nav.oj-lateral >> text=Uso do Luxi"); pg.wait_for_selector("button[aria-label*='Atelie Andressa']")
            pg.click("button[aria-label*='Atelie Andressa']"); pg.wait_for_selector("text=Modo observação"); pg.wait_for_timeout(500)
            if fotos: pg.screenshot(path=f"/tmp/shots/suporte-{w}x{h}.png", full_page=False)
            m = pg.evaluate("""() => ({ largura: document.documentElement.scrollWidth, janela: innerWidth,
                aviso: !!document.querySelector('.oj-aviso'), abas: document.querySelectorAll('[role=tab]').length,
                cortado: [...document.querySelectorAll('.oj-card, .oj-item, .oj-chip')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length })""")
            ruim = []
            if m["largura"] > m["janela"] + 1: ruim.append(f"rolagem para o lado ({m['largura']}>{m['janela']})")
            if m["cortado"]: ruim.append(f"{m['cortado']} elemento(s) passam da borda da tela")
            if not m["aviso"]: ruim.append("aviso de modo observação não aparece")
            if m["abas"] != 7: ruim.append(f"abas: {m['abas']} (esperado 7)")
            if erros: ruim.append("erro de JS: " + erros[0])
            print(("✅" if not ruim else "❌"), f"suporte em {nome}: abas={m['abas']}", ("— " + "; ".join(ruim)) if ruim else ""); problemas += ruim
            ctx.close()
        b.close()
    srv.parar(); return len(problemas)

if __name__ == "__main__":
    sys.exit(1 if rodar(fotos=True) else 0)
