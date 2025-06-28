#!/usr/bin/env python3
import ast
import sys

def check_syntax(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            source = f.read()
        
        # Tentar compilar o código
        ast.parse(source)
        print(f"✅ {filename} - Sintaxe OK")
        return True
        
    except SyntaxError as e:
        print(f"❌ {filename} - Erro de sintaxe:")
        print(f"   Linha {e.lineno}: {e.text}")
        print(f"   Erro: {e.msg}")
        return False
    except Exception as e:
        print(f"❌ {filename} - Erro: {e}")
        return False

if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else "middleware.py"
    check_syntax(filename)
