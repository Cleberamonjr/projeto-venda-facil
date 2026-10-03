"""Importar romaneio (OCR): o que a pessoa vê na conferência e o que é gravado. Servidor simulado, nada real.
Cobre: preço de venda já calculado com a margem; banho/pedra/modelo/tamanho vindos do robô (inclusive sem acento,
como a versão antiga devolvia); recálculo ao mudar o custo; venda manual não é sobrescrita; foto por item sobe para o
armazenamento e entra no registro; o campo de arquivo não força a câmera (aceita galeria e PDF)."""
import sys, json, base64
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, esperar_app
import lona_editor as le
from playwright.sync_api import sync_playwright

JPG = base64.b64decode("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=")

def rodar():
    srv = Servidor(); prob = []; ok = []
    def check(c, m): (ok if c else prob).append(m)
    Path("/tmp/romaneio.jpg").write_bytes(JPG)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        st = le.novo_estado("dona")
        st["romaneio"] = {"itens": [
            {"codigo": "AN-100", "nome": "Anel zircônia ouro 18k", "qtd": 2, "custo": 10, "banho": "Rodio branco", "pedra": "Zirconia", "acabamento": "Cravejada", "tamanho": "45 cm", "revisar": False},
            {"codigo": "BR-200", "nome": "Brinco liso", "qtd": 1, "custo": 20, "banho": "Banho torto", "pedra": "", "acabamento": "", "tamanho": "", "revisar": False}], "aviso": ""}
        ctx = le.contexto(b, {"width": 390, "height": 900}, "dona", st); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:120]))
        pg.goto(srv.url); esperar_app(pg)
        pg.click(".oj-atalhos >> text=Peças"); pg.wait_for_timeout(600)
        pg.click("text=Importar romaneio"); pg.wait_for_selector("text=Fotografar ou enviar PDF")
        entrada = pg.query_selector("input[type=file][accept*='pdf']")
        check(entrada is not None and entrada.get_attribute("capture") is None, "o campo do romaneio NÃO força a câmera (aceita galeria, arquivos e PDF)")
        entrada.set_input_files("/tmp/romaneio.jpg"); pg.wait_for_selector("text=AN-100", timeout=15000) if False else pg.wait_for_selector("input[value='AN-100']", timeout=15000)
        cards = [c for c in pg.query_selector_all(".oj-modal .oj-card") if c.query_selector("input[placeholder='Código']")]
        sels = lambda i, rot: cards[i].query_selector(f"xpath=.//label[normalize-space()='{rot}']/following-sibling::select").input_value()
        # margem do fornecedor padrão da loja de teste (lida da própria tela)
        txt = pg.inner_text(".oj-modal"); import re
        marg = int(re.search(r"margem de (\d+)%", txt).group(1))
        venda1 = float(cards[0].query_selector_all("input[type=number]")[2].input_value())
        check(abs(venda1 - round(10 * (1 + marg / 100), 2)) < 0.01, f"venda já calculada com a margem de {marg}%: custo 10 → {venda1}")
        check(sels(0, "Banho") == "Ródio branco", f"banho sem acento do robô casa com a opção do app: '{sels(0,'Banho')}'")
        check(sels(0, "Pedra") == "Zircônia" and sels(0, "Modelo") == "Cravejada" and sels(0, "Tamanho") == "45cm", f"pedra, modelo e tamanho preenchidos: {sels(0,'Pedra')} / {sels(0,'Modelo')} / {sels(0,'Tamanho')}")
        check(sels(1, "Banho") == "" and sels(1, "Pedra") == "", "valor que não casa vira 'Não informar' (nada torto)")
        check(float(cards[1].query_selector_all("input[type=number]")[2].input_value()) == round(20 * (1 + marg / 100), 2), "segundo item também com preço calculado")
        # mexer no custo recalcula a venda enquanto ela é a automática
        cards[0].query_selector_all("input[type=number]")[1].fill("30"); pg.wait_for_timeout(200)
        check(abs(float(cards[0].query_selector_all("input[type=number]")[2].input_value()) - round(30 * (1 + marg / 100), 2)) < 0.01, "mudar o custo recalcula a venda automática")
        # venda digitada à mão não é sobrescrita
        cards[0].query_selector_all("input[type=number]")[2].fill("99"); cards[0].query_selector_all("input[type=number]")[1].fill("40"); pg.wait_for_timeout(200)
        check(float(cards[0].query_selector_all("input[type=number]")[2].input_value()) == 99, "venda digitada à mão fica travada (mudar o custo não a sobrescreve)")
        check("Sem foto, esta peça não aparece na loja on-line" in cards[0].inner_text(), "sem foto, a tela avisa que a peça não aparece na loja")
        # foto por item
        cards[0].query_selector_all("input[type=file]")[0].set_input_files("/tmp/romaneio.jpg"); pg.wait_for_timeout(900)
        check("A primeira foto é a que aparece na loja on-line" in cards[0].inner_text(), "com foto, o aviso some")
        pg.click("text=Confirmar >> nth=-1") if False else None
        botoes = [x for x in pg.query_selector_all(".oj-modal button") if "Confirmar" in (x.inner_text() or "") or "Salvar" in (x.inner_text() or "")]
        check(len(botoes) > 0, "há botão para confirmar")
        botoes[-1].click(); pg.wait_for_timeout(1800)
        envios_foto = [e for e in st["envios"] if "fotos-pecas" in e]
        check(len(envios_foto) >= 1, f"a foto foi para o armazenamento de fotos ({len(envios_foto)} envio)")
        grav = " ".join(str(g[2]) for g in st.get("gravacoes", []) if g[2])
        check("storage/v1/object/public/fotos-pecas" in grav and "data:image" not in grav, "a peça foi gravada com o ENDEREÇO da foto (não com a imagem embutida)")
        check('"banho":"Ródio branco"' in grav and '"pedra":"Zircônia"' in grav and '"venda_centavos":9900' in grav, "banho, pedra e a venda digitada (R$ 99) chegam ao registro da peça")
        check(not erros, f"sem erro de JavaScript {erros[:2]}")
        ctx.close()

        # ---- fotografar peça que JÁ está no estoque (atalho na tela da loja) ----
        for cenario in ("ok", "negado"):
            st = le.novo_estado("dona"); st["storage_403"] = (cenario == "negado")
            ctx = le.contexto(b, {"width": 390, "height": 900}, "dona", st); pg = ctx.new_page()
            pg.goto(srv.url); esperar_app(pg); pg.click(".oj-hamb"); pg.wait_for_timeout(250)
            pg.click("nav.oj-lateral >> text=Loja on-line"); pg.wait_for_selector("text=Peças sem foto")
            botao = pg.query_selector("label[aria-label='Adicionar foto de Brinco sem foto web']")
            check(botao is not None, f"[{cenario}] a tela lista a peça sem foto com o botão 'Adicionar foto'")
            check("não aparece" in pg.inner_text(".lona-ed").lower(), f"[{cenario}] a tela diz que peça sem foto NÃO aparece na loja")
            botao.query_selector("input").set_input_files("/tmp/romaneio.jpg"); pg.wait_for_timeout(1500)
            if cenario == "ok":
                check(any("fotos-pecas" in e for e in st["envios"]), "[ok] a foto foi para o armazenamento de fotos")
                pat = [g for g in st.get("gravacoes", []) if g[0] == "PATCH" and g[1].endswith("/pecas")]
                check(pat and "storage/v1/object/public/fotos-pecas" in (pat[-1][2] or ""), "[ok] a peça foi atualizada com o ENDEREÇO da foto")
                check("Foto de Brinco sem foto web salva" in pg.inner_text(".lona-ed"), "[ok] aviso de sucesso")
            else:
                check("Sem permissão para enviar foto" in pg.inner_text(".lona-ed"), "[negado] o erro 403 aparece em português (não some calado)")
                check(not [g for g in st.get("gravacoes", []) if g[0] == "PATCH" and g[1].endswith("/pecas")], "[negado] nada é gravado na peça")
            ctx.close()
        b.close()
    srv.parar()
    print(f"OK: {len(ok)} verificações passaram")
    for m in prob: print("PROBLEMA:", m)
    return len(prob)

if __name__ == "__main__":
    sys.exit(1 if rodar() else 0)
