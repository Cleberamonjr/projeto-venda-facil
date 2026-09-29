"""Login em NAVEGADOR REAL: a mensagem de erro não revela se o e-mail existe, e a 6ª tentativa seguida é barrada na tela."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
from playwright.sync_api import sync_playwright

def rodar():
    srv = Servidor(); problemas = []
    with sync_playwright() as p:
        b = p.chromium.launch(); grava = []
        ctx, _ = preparar_contexto(b, {"width": 1366, "height": 768}, logado=False, login_falha=True, capturas=grava)
        pg = ctx.new_page(); pg.goto(srv.url); pg.wait_for_selector("text=Entrar", timeout=15000)
        pg.fill("input[autocomplete=username], input[type=email], input:not([type=password])", "qualquer@teste.com")
        pg.fill("input[type=password]", "senha-errada")
        mensagens = []
        for i in range(7):
            pg.click("button:has-text('Entrar')"); pg.wait_for_timeout(450)
            mensagens.append(pg.evaluate("document.querySelector('.oj-erro')?.textContent || ''"))
        chamadas = sum(1 for c in grava if c[0] == "token")
        b.close()
    srv.parar()
    if chamadas > 5: problemas.append(f"o servidor recebeu {chamadas} tentativas (deveria parar em 5)")
    if not any("Muitas tentativas" in m for m in mensagens[5:]): problemas.append("a 6ª/7ª tentativa não foi barrada com aviso")
    if not any("E-mail ou senha incorretos" in m for m in mensagens[:5]): problemas.append("mensagem de erro do login não é a genérica esperada")
    if any(("não existe" in m.lower() or "não encontrad" in m.lower() or "cadastrad" in m.lower()) for m in mensagens): problemas.append("a mensagem revela se o e-mail existe")
    print(("✅" if not problemas else "❌"), f"login: {chamadas} chamadas ao servidor em 7 cliques; 1ª msg = “{mensagens[0][:40]}”; 7ª msg = “{mensagens[6][:44]}”", ("— " + "; ".join(problemas)) if problemas else "")
    return len(problemas)

if __name__ == "__main__":
    sys.exit(1 if rodar() else 0)
