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
PREVIA = {"user_id": "u-dona", "email": "andressa.com.um.email.bem.comprido@exemplo.com.br", "e_admin": False, "sou_eu": False, "lojas": [{"id": "l2", "nome": "Atelie Andressa com um nome bem comprido para testar quebra de linha"}], "assinatura_status": "ativa", "e_consultora_de": ["Loja da Maria", "Loja da Joana"], "tem_acesso_beta": True,
          "contagens": {"pecas": 40, "vendas": 30, "clientes": 20, "despesas": 12, "romaneios": 4, "baixas": 3, "colecoes": 2, "maletas": 1, "consultoras": 3, "consultoras_com_conta": 2, "arquivos": 57, "registros_financeiros": 2}}
COPIA = {"exportado_em": "2026-09-29T12:00:00Z", "loja": {"nome": "Atelie"}, "pecas": [{"codigo": "AN-1"}], "vendas": []}
LOJA = {"loja": {"id": "l2", "nome": "Atelie Andressa com um nome bem comprido para testar quebra de linha", "whatsapp": "5511999990001", "dona_id": "u-dona"},
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
            ctx, _ = preparar_contexto(b, {"width": w, "height": h}, rpc={"sou_admin_luxi": True, "uso_lojas_luxi": USO, "admin_ver_loja": LOJA, "admin_prever_exclusao": PREVIA, "admin_exportar_loja": COPIA, "admin_contas_sem_loja": []})
            pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:100]))
            pg.goto(srv.url); esperar_app(pg)
            pg.click(".oj-hamb"); pg.wait_for_timeout(300); pg.click("nav.oj-lateral >> text=Uso do Luxi"); pg.wait_for_selector("button[aria-label*='Atelie Andressa']")
            pg.click("button[aria-label*='Atelie Andressa']"); pg.wait_for_selector("text=Modo observação"); pg.wait_for_timeout(500)
            if fotos: pg.screenshot(path=f"/tmp/shots/suporte-{w}x{h}.png", full_page=False)
            m = pg.evaluate("""() => ({ largura: document.documentElement.scrollWidth, janela: innerWidth,
                aviso: !!document.querySelector('.oj-aviso'), abas: document.querySelectorAll('[role=tab]').length,
                cortado: [...document.querySelectorAll('.oj-card, .oj-item, .oj-chip')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length })""")
            ruim = []
            # --- botão discreto de sair: precisa estar visível NO TOPO da página e depois de rolar até o fim ---
            MEDE_SAIR = """() => { const b = document.querySelector('.oj-sair-espiao'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
                const bate = [...document.querySelectorAll('body *')].filter(e => e !== b && !b.contains(e) && getComputedStyle(e).position === 'fixed' && e.id !== 'luxi-nova-versao')
                  .filter(e => { const q = e.getBoundingClientRect(); const cobreTudo = q.width > innerWidth * .9 && q.height > innerHeight * .9; return !cobreTudo && q.width > 0 && !(q.right < r.left || q.left > r.right || q.bottom < r.top || q.top > r.bottom); }).length;
                return { dentro: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, largura: Math.round(r.width), opacidade: parseFloat(cs.opacity), sobrepoe: bate, paginaExtra: document.documentElement.scrollHeight - document.querySelector('.oja, .oj').scrollHeight }; }"""
            pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(200); topo_sair = pg.evaluate(MEDE_SAIR)
            pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(250); fim_sair = pg.evaluate(MEDE_SAIR)
            for onde, sair in (("no topo da página", topo_sair), ("no fim da página", fim_sair)):
                if not sair: ruim.append("botão de sair do modo observação não existe"); continue
                if not sair["dentro"]: ruim.append(f"botão de sair FORA da tela {onde}")
                if sair["largura"] > 44: ruim.append(f"botão de sair grande demais ({sair['largura']}px)")
                if sair["opacidade"] > 0.5: ruim.append(f"botão de sair pouco discreto (opacidade {sair['opacidade']})")
                if sair["sobrepoe"]: ruim.append(f"botão de sair tapa {sair['sobrepoe']} elemento(s) fixo(s) {onde}")
            # --- janela de exclusão cabe na tela, botões alcançáveis, sem rolar para o lado ---
            pg.click("text=Excluir esta cliente e os dados dela"); pg.wait_for_selector("text=Será apagado de forma permanente"); pg.wait_for_timeout(400)
            if fotos: pg.screenshot(path=f"/tmp/shots/exclusao-{w}x{h}.png")
            j = pg.evaluate("""() => { const m = document.querySelector('.oj-modal'), r = m.getBoundingClientRect();
                const acao = [...m.querySelectorAll('button')].find(b => /Excluir definitivamente/.test(b.textContent)); acao.scrollIntoView({block: 'center'});
                const ra = acao.getBoundingClientRect(), rm = m.getBoundingClientRect();
                return { topo: Math.round(r.top), base: Math.round(r.bottom), janela: innerHeight, largura: document.documentElement.scrollWidth, larguraJanela: innerWidth,
                         botaoVisivel: ra.top >= rm.top - 1 && ra.bottom <= rm.bottom + 1, travado: acao.disabled }; }""")
            if j["topo"] < 0 or j["base"] > j["janela"] + 1: ruim.append(f"janela de exclusão passa da tela ({j['topo']}..{j['base']} de {j['janela']})")
            if not j["botaoVisivel"]: ruim.append("botão 'Excluir definitivamente' não fica visível na janela")
            if not j["travado"]: ruim.append("botão de excluir já começa liberado (deveria estar travado)")
            if j["largura"] > j["larguraJanela"] + 1: ruim.append("rolagem para o lado na janela de exclusão")
            # --- a cópia dos dados baixa de verdade ---
            with pg.expect_download(timeout=8000) as dl:
                pg.click("text=Baixar cópia dos dados antes")
            arquivo_baixado = dl.value.suggested_filename
            conteudo = json.loads(Path(dl.value.path()).read_text(encoding="utf-8"))
            if not (arquivo_baixado.startswith("luxi-copia-") and arquivo_baixado.endswith(".json") and "pecas" in conteudo): ruim.append(f"cópia baixada inválida ({arquivo_baixado})")
            pg.click(".oj-modal >> text=Cancelar"); pg.wait_for_timeout(200)
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
