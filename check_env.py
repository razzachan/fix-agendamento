import os
import sys
import json
from dotenv import load_dotenv

def main():
    """
    Script para verificar as variáveis de ambiente.
    """
    print("=== Verificação de Variáveis de Ambiente ===")
    
    # Carregar variáveis de ambiente do arquivo .env
    load_dotenv()
    
    # Verificar variáveis específicas
    print("\nVerificando variáveis específicas:")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    print(f"SUPABASE_URL: {\"Definida\" if supabase_url else \"NÃO DEFINIDA\"}")
    if supabase_url:
        print(f"  Valor: {supabase_url}")
    
    print(f"SUPABASE_KEY: {\"Definida\" if supabase_key else \"NÃO DEFINIDA\"}")
    if supabase_key:
        print(f"  Valor: {supabase_key[:10]}...")
    
    # Verificar se as variáveis estão definidas
    if not supabase_url or not supabase_key:
        print("\n❌ ERRO: Uma ou mais variáveis de ambiente necessárias não estão definidas.")
        sys.exit(1)
    else:
        print("\n✅ Todas as variáveis de ambiente necessárias estão definidas.")

if __name__ == "__main__":
    main()
