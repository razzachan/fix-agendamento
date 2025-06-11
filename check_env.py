import os
import sys
import json

def main():
    """
    Script para verificar as variáveis de ambiente no Railway.
    """
    print("=== Verificação de Variáveis de Ambiente ===")
    
    # Listar todas as variáveis de ambiente
    print("\nTodas as variáveis de ambiente:")
    env_vars = dict(os.environ)
    
    # Remover variáveis sensíveis para não expor no log
    for key in list(env_vars.keys()):
        if "KEY" in key or "SECRET" in key or "TOKEN" in key or "PASSWORD" in key:
            env_vars[key] = "***REDACTED***"
    
    # Imprimir variáveis de ambiente formatadas
    print(json.dumps(env_vars, indent=2))
    
    # Verificar variáveis específicas
    print("\nVerificando variáveis específicas:")
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    print(f"SUPABASE_URL: {'Definida' if supabase_url else 'NÃO DEFINIDA'}")
    if supabase_url:
        print(f"  Valor: {supabase_url[:20]}...")
    
    print(f"SUPABASE_KEY: {'Definida' if supabase_key else 'NÃO DEFINIDA'}")
    if supabase_key:
        print(f"  Valor: {supabase_key[:10]}...")
    
    # Verificar se as variáveis estão definidas
    if not supabase_url or not supabase_key:
        print("\n❌ ERRO: Uma ou mais variáveis de ambiente necessárias não estão definidas.")
        print("Por favor, configure as variáveis de ambiente no Railway:")
        print("1. Acesse o Railway Dashboard: https://railway.app/dashboard")
        print("2. Selecione seu projeto")
        print("3. Vá para a aba 'Variables'")
        print("4. Adicione as variáveis SUPABASE_URL e SUPABASE_KEY")
        print("5. Clique em 'Deploy' para aplicar as mudanças")
        sys.exit(1)
    else:
        print("\n✅ Todas as variáveis de ambiente necessárias estão definidas.")

if __name__ == "__main__":
    main()
