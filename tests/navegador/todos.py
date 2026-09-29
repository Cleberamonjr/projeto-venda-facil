"""Roda todos os testes em navegador real: cadastro de produto (layout) + política de segurança."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import editor, csp, login, suporte
falhas = editor.rodar(salvar_fotos=False)
print("\n--- política de segurança (BLOQUEANDO) ---")
ruim = csp.relatar(csp.rodar(csp.politica_completa()))
print("\n--- login ---")
ruim_login = login.rodar()
print("\n--- suporte da administradora ---")
ruim_suporte = suporte.rodar()
todos_ok = not (falhas or ruim or ruim_login or ruim_suporte)
print("\nNAVEGADOR REAL: TUDO OK" if todos_ok else "\nNAVEGADOR REAL: HÁ PROBLEMAS")
sys.exit(0 if todos_ok else 1)
