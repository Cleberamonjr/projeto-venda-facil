"""Base dos testes em NAVEGADOR REAL (Chromium). Serve o app pronto (dist/) com os cabeçalhos do
arquivo _headers e simula o Supabase por baixo. Não toca em nenhum dado real."""
import json, os, re, threading, http.server, socketserver, functools, time
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parents[2]
DIST = RAIZ / "dist"
SUPA = "https://eraxjtfedswksiyigasf.supabase.co"
CHAVE_SESSAO = "sb-eraxjtfedswksiyigasf-auth-token"

def ler_headers(caminho=None):
    """Lê o _headers no formato do Cloudflare: [(padrão, {cabeçalho: valor})]."""
    arq = Path(caminho) if caminho else DIST / "_headers"
    blocos, atual = [], None
    for linha in arq.read_text(encoding="utf-8").splitlines():
        if not linha.strip() or linha.strip().startswith("#"): continue
        if not linha.startswith((" ", "\t")):
            atual = (linha.strip(), {}); blocos.append(atual)
        elif atual and ":" in linha:
            k, v = linha.strip().split(":", 1); atual[1][k.strip()] = v.strip()
    return blocos

def casa(padrao, caminho):
    rx = "^" + re.escape(padrao).replace(r"\*", ".*") + "$"
    return re.match(rx, caminho) is not None

class Servidor:
    def __init__(self, headers_arq=None, extra=None):
        blocos = ler_headers(headers_arq) if (headers_arq or (DIST / "_headers").exists()) else []
        extra = extra or {}
        class H(http.server.SimpleHTTPRequestHandler):
            def __init__(s, *a, **k): super().__init__(*a, directory=str(DIST), **k)
            def log_message(s, *a): pass
            def end_headers(s):
                caminho = urlparse(s.path).path
                for padrao, hs in blocos:
                    if casa(padrao, caminho):
                        for k, v in hs.items(): s.send_header(k, v)
                for k, v in extra.items(): s.send_header(k, v)
                super().end_headers()
        socketserver.TCPServer.allow_reuse_address = True
        self.httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), H)
        self.porta = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
    @property
    def url(self): return f"http://127.0.0.1:{self.porta}/"
    def parar(self): self.httpd.shutdown(); self.httpd.server_close()

USUARIO = {"id": "u1", "aud": "authenticated", "role": "authenticated", "email": "dona@teste.com",
           "app_metadata": {}, "user_metadata": {}, "created_at": "2026-09-06T00:00:00Z"}

def loja_padrao(n_pecas=0):
    futuro = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 20 * 86400))
    pecas = [{"id": f"p{i}", "loja_id": "L1", "codigo": f"AN-{100+i}", "nome": f"Anel modelo {i}", "qtd": 3,
              "custo_centavos": 2500, "venda_centavos": 6900, "banho": "Ouro 18k", "fotos": [],
              "entrada_em": "2026-09-20T00:00:00Z", "arquivada": False, "fornecedor": "Prata Fina"} for i in range(n_pecas)]
    return {
        "lojas": [{"id": "L1", "nome": "Loja X", "dona_id": "u1", "margem_padrao": 100,
                   "formas_pagamento": ["Dinheiro", "Pix"],
                   "fornecedores_json": [{"nome": "Prata Fina", "margem": 120}, {"nome": "Del Rey", "margem": 150}]}],
        "assinaturas": [{"loja_id": "L1", "plano": "crescimento", "status": "trial", "trial_ate": futuro}],
        "consultoras": [{"id": "c1", "loja_id": "L1", "nome": "Dona", "eh_dona": True, "ativa": True, "comissao": 0}],
        "pecas": pecas,
    }

def preparar_contexto(browser, viewport, tabelas=None, rpc=None, logado=True, capturas=None, sw="block", **kw):
    """Cria um contexto de navegador com o Supabase simulado. `capturas` (lista) recebe as gravações."""
    ctx = browser.new_context(viewport=viewport, service_workers=sw, **kw)
    rpc = {"sou_admin_luxi": False, "meu_acesso_beta": None, **(rpc or {})}
    tabelas = tabelas or {}
    capturas = capturas if capturas is not None else []
    if logado:
        sessao = {"access_token": "a.b.c", "refresh_token": "r", "token_type": "bearer",
                  "expires_at": int(time.time()) + 3600, "expires_in": 3600, "user": USUARIO}
        ctx.add_init_script(f"localStorage.setItem('{CHAVE_SESSAO}', {json.dumps(json.dumps(sessao))});")

    def tratar(route, request):
        url, metodo = request.url, request.method
        caminho = urlparse(url).path
        cab = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"}
        if metodo == "OPTIONS": return route.fulfill(status=204, headers=cab)
        def j(corpo, status=200): route.fulfill(status=status, headers={**cab, "content-type": "application/json"}, body=json.dumps(corpo))
        if caminho.startswith("/auth/v1/user"): return j(USUARIO) if logado else j({"message": "sem sessão"}, 401)
        if caminho.startswith("/auth/v1/"): return j({})
        if caminho.startswith("/storage/v1/object/") and metodo == "POST":
            capturas.append(("storage", caminho, None)); return j({"Key": caminho})
        m = re.match(r"/rest/v1/rpc/([a-z_]+)", caminho)
        if m: return j(rpc.get(m.group(1)))
        m = re.match(r"/rest/v1/([a-z_]+)", caminho)
        if m:
            if metodo in ("POST", "PATCH", "DELETE"):
                capturas.append((m.group(1), metodo, request.post_data)); return route.fulfill(status=201, headers=cab, body="")
            return j(tabelas.get(m.group(1), []))
        return j(None)
    ctx.route(SUPA + "/**", tratar)
    return ctx, capturas

def esperar_app(pg, ms=15000):
    """Espera a animação de abertura terminar e o app aparecer."""
    pg.wait_for_selector(".oj-atalho, .oj-hamb", timeout=ms)
