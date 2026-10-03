"""Auditoria da tela da lona no app: 3 larguras x 2 temas x (lona com peças, pedidos, prévia).
Reaproveita o detector do painel (contraste do texto, alvos de toque, texto espremido, rolagem lateral)."""
import sys, copy
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import Servidor, esperar_app
import painel_celular as pc
import lona_editor as le
from playwright.sync_api import sync_playwright

def rodar(fotos=False):
    srv = Servidor(); ruim = []; n = 0
    if fotos: Path("/tmp/shots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
        for tema in pc.TEMAS:
            for w, h in [(320, 640), (390, 844), (430, 932)]:
                st = le.novo_estado("dona")
                st["lona"]["rascunho"].update({"nome": "Dona", "whatsapp": "11999998888", "ordem": ["p1", "p2"],
                    "itens": {"p1": {"preco": "preco", "centavos": 6900, "tamanho": True, "banho": True, "nota": "Polido.", "foto": 0},
                              "p2": {"preco": "consulte", "centavos": 18900, "tamanho": True, "banho": False, "nota": "", "foto": 0}}})
                ctx = le.contexto(b, {"width": w, "height": h}, "dona", st)
                ctx.add_init_script(f"localStorage.setItem('luxi:tema','{tema}')")
                pg = ctx.new_page(); pg.goto(srv.url); le.abrir_lona(pg); pg.wait_for_timeout(500)
                for nome in ["lona com peças", "pedidos", "prévia"]:
                    if nome == "pedidos": pg.click("[role=tab]:has-text('Pedidos')"); pg.wait_for_selector("text=Maria Cliente"); pg.click(".oj-card:has-text('Joana') button:has-text('Confirmar venda')")
                    if nome == "prévia": pg.click("[role=tab]:has-text('Minha lona')"); pg.click("button:has-text('Ver como a cliente vê')"); pg.wait_for_selector(".lona--previa .lona-peca")
                    pg.wait_for_timeout(250); n += 1
                    for x in pg.evaluate(pc.AUDITORIA, tema):
                        if "campo com 13.33" in x and ("file" in x or "Escolher outra cor" in x): continue   # campos de arquivo/cor: não abrem teclado
                        if ".lona--previa" in x or ".lona " in x: continue   # a prévia é a vitrine (sempre clara) e tem teste próprio
                        ruim.append(f"[{tema} {w}px · {nome}] {x}")
                    if fotos and w == 390 and tema == "escuro": pg.screenshot(path=f"/tmp/shots/lona-{nome.split()[0]}-escuro.png")
                ctx.close()
        b.close()
    srv.parar()
    print(f"{'✅' if not ruim else '❌'} lona no app: {n} combinações (3 larguras × 2 temas × 3 telas)")
    for r in ruim[:25]: print("  PROBLEMA:", r)
    return len(ruim)

if __name__ == "__main__":
    sys.exit(1 if rodar("--fotos" in sys.argv) else 0)
