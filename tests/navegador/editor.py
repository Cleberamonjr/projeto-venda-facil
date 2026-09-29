"""Cadastro de produto em NAVEGADOR REAL: cabe na tela de notebook? Botões fixos? Todos os campos alcançáveis?"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from base import *
from playwright.sync_api import sync_playwright

TELAS = [("notebook 1366x768", 1366, 768), ("notebook 1280x720", 1280, 720), ("notebook 1440x900", 1440, 900),
         ("notebook pequeno 1024x640", 1024, 640), ("celular 390x844", 390, 844), ("celular pequeno 360x640", 360, 640)]

def geometria(pg):
    """Posição real ao abrir (antes de rolar qualquer coisa): o modal cabe na janela? o título aparece inteiro?"""
    return pg.evaluate("""() => { const q=s=>document.querySelector(s), r=e=>e.getBoundingClientRect();
      const m=r(q('.oj-editor-modal')), c=r(q('.oj-editor-cabecalho')), f=q('.oj-fundo-editor');
      return { A: innerHeight, topo: Math.round(m.top), base: Math.round(m.bottom), tituloTopo: Math.round(c.top), fundoRola: f.scrollHeight > f.clientHeight + 1 }; }""")

def medir(pg):
    return pg.evaluate("""() => {
      const q = s => document.querySelector(s), r = e => e ? e.getBoundingClientRect() : null;
      const modal = q('.oj-editor-modal'), esc = q('.oj-editor-scroll'), ac = q('.oj-editor-acoes'), cab = q('.oj-editor-cabecalho');
      const A = innerHeight;
      const rm = r(modal), re = r(esc), ra = r(ac), rc = r(cab);
      // cada campo/controle do formulário: dá para chegar até ele e fica fora do rodapé?
      const controles = [...esc.querySelectorAll('input:not([type=file]), select, textarea, button.oj-chip')];
      let alcancaveis = 0, escondidos = [];
      for (const c of controles) {
        c.scrollIntoView({block: 'center'});
        const b = c.getBoundingClientRect();
        const visivel = b.top >= re.top - 1 && b.bottom <= re.bottom + 1 && b.height > 0;
        const sobRodape = b.bottom > ra.top + 1 && b.top < ra.bottom;
        if (visivel && !sobRodape) alcancaveis++; else escondidos.push((c.getAttribute('aria-label') || c.placeholder || c.textContent || c.tagName).trim().slice(0, 24));
      }
      esc.scrollTop = 0;
      return { A, modalAltura: Math.round(rm.height), modalTopo: Math.round(rm.top), rodapeFundo: Math.round(ra.bottom), rodapeTopo: Math.round(ra.top),
               cabecalhoAltura: Math.round(rc.height), areaRolavel: Math.round(re.height), conteudoTotal: esc.scrollHeight,
               rola: esc.scrollHeight > esc.clientHeight, controles: controles.length, alcancaveis, escondidos,
               botoesVisiveis: ra.top >= 0 && ra.bottom <= A + 1,
               larguraOk: document.documentElement.scrollWidth <= innerWidth + 1 };
    }""")

def rodar(salvar_fotos=True):
    srv = Servidor(); falhas = []
    if salvar_fotos: Path('/tmp/shots').mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for nome, w, h in TELAS:
            grava = []
            ctx, _ = preparar_contexto(b, {"width": w, "height": h}, tabelas=loja_padrao(3), capturas=grava)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(srv.url); esperar_app(pg)
            pg.click(".oj-atalhos >> text=Peças") if w >= 640 else pg.click(".oj-atalhos >> text=Peças")
            pg.click("text=+ Cadastrar produto")
            pg.wait_for_selector(".oj-editor-modal"); pg.wait_for_timeout(600)
            g = geometria(pg)
            if salvar_fotos: pg.screenshot(path=f"/tmp/shots/editor-{w}x{h}.png")   # foto ANTES de medir/rolar
            m = medir(pg)
            problemas = []
            if g["topo"] < 0 or g["tituloTopo"] < 0: problemas.append(f"TOPO CORTADO ({g['topo']}px fora da tela)")
            if g["base"] > g["A"] + 1: problemas.append(f"base do modal passa da janela ({g['base']}>{g['A']})")
            if g["fundoRola"]: problemas.append("a moldura de trás também rola (rolagem dupla)")
            if not m["botoesVisiveis"]: problemas.append("botões Incluir/Cancelar FORA da tela")
            if m["alcancaveis"] != m["controles"]: problemas.append(f"campos inalcançáveis: {m['escondidos']}")
            if not m["larguraOk"]: problemas.append("rolagem horizontal indesejada")
            if m["areaRolavel"] < 180: problemas.append(f"área do formulário minúscula ({m['areaRolavel']}px)")
            if erros: problemas.append("erro de JS: " + erros[0][:60])
            print(("✅" if not problemas else "❌"), nome.ljust(26),
                  f"janela {m['A']}px | formulário {m['areaRolavel']}px visíveis de {m['conteudoTotal']}px (rola={'sim' if m['rola'] else 'não'}) | campos alcançáveis {m['alcancaveis']}/{m['controles']} | rodapé fixo={'sim' if m['botoesVisiveis'] else 'NÃO'}",
                  ("— " + "; ".join(problemas)) if problemas else "")
            if problemas: falhas.append(nome)
            ctx.close()
        b.close()
    srv.parar()
    return falhas

if __name__ == "__main__":
    f = rodar()
    print("\nTODAS AS RESOLUÇÕES OK" if not f else f"\nPROBLEMAS EM: {', '.join(f)}")
    sys.exit(1 if f else 0)
