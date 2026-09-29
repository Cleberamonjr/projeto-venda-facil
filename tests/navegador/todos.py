"""Roda todos os testes em navegador real: cadastro de produto (layout) + política de segurança."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import editor, csp
falhas = editor.rodar(salvar_fotos=False)
print("\n--- política de segurança (BLOQUEANDO) ---")
ruim = csp.relatar(csp.rodar(csp.politica_completa()))
print("\nNAVEGADOR REAL: TUDO OK" if not (falhas or ruim) else "\nNAVEGADOR REAL: HÁ PROBLEMAS")
sys.exit(1 if (falhas or ruim) else 0)
