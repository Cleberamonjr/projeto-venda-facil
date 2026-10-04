"""QA de navegador real da Maleta — Equipe.
Não toca no banco real: usa Supabase simulado e verifica o fluxo de acerto,
linguagem, bloqueio do Solo, prazo vencido, unidade por unidade e PDF.
"""
import sys, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
from playwright.sync_api import sync_playwright

def rodar():
    ruim=[]; srv=Servidor()
    acerto={"id":"a1","maleta_id":"m1","status":"aberto","dona_confirmou_em":None,
            "consultora_confirmou_em":None,"acerto_junto":False,"fechado_em":None,
            "resumo":{"voltou":0,"vendeu":0,"repasse":0,"comissao":0,"sumiu":0,"lucro":0},
            "itens":[
              {"id":"u1","maleta_item_id":"mi1","unidade":1,"estado":"pendente","codigo":"AN-101","nome":"Anel modelo 0","custo_centavos":2500,"venda_centavos":6900,"comissao_centavos":0,"venda_id":None},
              {"id":"u2","maleta_item_id":"mi1","unidade":2,"estado":"pendente","codigo":"AN-101","nome":"Anel modelo 0","custo_centavos":2500,"venda_centavos":6900,"comissao_centavos":0,"venda_id":None},
            ]}
    tabelas=loja_padrao(1)
    tabelas["consultoras"].append({"id":"c2","loja_id":"L1","nome":"Patrícia","eh_dona":False,"ativa":True,"comissao":15,"usuario_id":None})
    tabelas["maletas"]=[{"id":"m1","loja_id":"L1","consultora_id":"c2","prazo_dias":30,
                         "status":"aberta","aberta_em":"2026-08-01T00:00:00Z","fechada_em":None}]
    tabelas["maleta_itens"]=[{"id":"mi1","maleta_id":"m1","peca_id":"p0","codigo":"AN-101","nome":"Anel modelo 0",
                              "qtd":2,"custo_centavos":2500,"venda_centavos":6900,"banho":"Ouro 18k"}]
    def salvar_acerto(corpo):   # guarda os estados enviados, como o servidor de verdade faz
        novos = {x["id"]: x for x in (corpo.get("p_itens") or [])}
        for it in acerto["itens"]:
            if it["id"] in novos:
                it["estado"] = novos[it["id"]].get("estado", it["estado"]); it["venda_id"] = novos[it["id"]].get("venda_id")
        return {"ok":True,"fechou":False,"pendentes":sum(1 for i in acerto["itens"] if i["estado"]=="pendente"),"resumo":acerto["resumo"]}
    rpc={"sou_admin_luxi":False,"meu_acesso_beta":None,"maleta_acerto_dados":lambda corpo: acerto,
         "maleta_acerto_salvar":salvar_acerto,
         "maleta_acerto_fechar":{"ok":True,"fechou":True,"acerto_id":"a1"}}
    with sync_playwright() as p:
        b=p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        ctx,capturas=preparar_contexto(b,{"width":390,"height":844},tabelas=tabelas,rpc=rpc,registrar_rpc=True)
        pg=ctx.new_page(); pg.goto(srv.url); esperar_app(pg)
        pg.click(".oj-hamb")
        pg.locator("nav.oj-lateral >> text=Equipe").first.wait_for(timeout=5000)   # o menu abre com animação
        pg.locator("nav.oj-lateral >> text=Equipe").click()                          # a Maleta fica dentro do grupo Equipe
        try: pg.locator("nav.oj-lateral >> text=Maleta").first.wait_for(timeout=3000)
        except Exception: pass
        if not pg.locator("nav.oj-lateral >> text=Maleta").count(): ruim.append("Equipe não exibe Maleta no menu")
        pg.locator("nav.oj-lateral >> text=Maleta").click()
        try: pg.get_by_text("Capital na rua").first.wait_for(timeout=10000)   # a tela busca os dados antes de desenhar: espera o texto, não um tempo fixo
        except Exception: pass
        if not pg.get_by_text("Capital na rua").count(): ruim.append("Não apareceu CAPITAL NA RUA")
        if not pg.get_by_text("Prazo de acertar venceu").count(): ruim.append("Não apareceu o aviso de prazo vencido")
        # o cartão da maleta vem recolhido: tocar nele abre o acerto (a tela busca os dados no servidor ao abrir)
        pg.locator("[role=button]:has-text('Patrícia')").first.click()
        try: pg.get_by_text("Acertar e zerar").first.wait_for(timeout=10000)
        except Exception: pass
        if not pg.get_by_text("Acertar e zerar").count(): ruim.append("Não apareceu a ação principal Acertar e zerar")
        pg.get_by_text("Acertar e zerar").first.click(); pg.wait_for_timeout(200)
        for t in ["Voltou","Vendeu","Sumiu","Ela te repassa","Você paga de comissão","Custo do que sumiu","Seu lucro neste acerto"]:
            if not pg.get_by_text(t, exact=True).count(): ruim.append("Faltou texto do acerto: "+t)
        if pg.get_by_text("Unidade 1").count()!=1 or pg.get_by_text("Unidade 2").count()!=1:
            ruim.append("A conferência não expôs cada unidade separadamente")
        pg.get_by_role("button",name="Vendeu").first.click()
        for _ in range(30):   # espera a gravação e a tela se atualizarem (até 3 s), em vez de um tempo fixo
            if any(x[0]=="maleta_acerto_salvar" for x in capturas) and pg.get_by_text("Registrar venda").count(): break
            pg.wait_for_timeout(100)
        if not any(x[0]=="maleta_acerto_salvar" for x in capturas): ruim.append("A escolha de estado não foi persistida via RPC")
        if not pg.get_by_text("Registrar venda").count(): ruim.append("Vendeu sem venda não ofereceu Registrar venda")
        if pg.get_by_text("PDF do acerto").count()!=1: ruim.append("PDF do acerto não apareceu")
        if pg.get_by_text("encontro de contas").count(): ruim.append("Interface usou jargão proibido")
        if pg.get_by_text("CMV").count() or pg.get_by_text("liquidação").count(): ruim.append("Interface usou jargão proibido")
        ctx.close()
        # Solo não vê a operação de Maleta.
        tabelas_solo=dict(tabelas)
        tabelas_solo["assinaturas"]=[{"loja_id":"L1","plano":"inicio","status":"ativa","trial_ate":None}]
        ctx2,_=preparar_contexto(b,{"width":390,"height":844},tabelas=tabelas_solo,rpc=rpc)
        pg2=ctx2.new_page(); pg2.goto(srv.url); esperar_app(pg2)
        if pg2.locator("nav.oj-lateral >> text=Maleta").count():
            ruim.append("Solo exibiu Maleta no menu")
        ctx2.close(); b.close()
    srv.parar()
    print(("✅" if not ruim else "❌")+" QA Maleta: "+("TUDO OK" if not ruim else "; ".join(ruim)))
    return len(ruim)

if __name__=="__main__":
    sys.exit(1 if rodar() else 0)
