import os
import sys
import json
from supabase import create_client, Client

# Definir as variáveis de ambiente diretamente no script
os.environ["SUPABASE_URL"] = "https://hdyucwabemspehokoiks.supabase.co"
os.environ["SUPABASE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"

def test_supabase_connection():
    """Testa a conexão com o Supabase e tenta inserir um registro de teste."""
    try:
        # Obter variáveis de ambiente
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")

        print(f"SUPABASE_URL: {supabase_url}")
        print(f"SUPABASE_KEY (primeiros 20 caracteres): {supabase_key[:20]}...")

        # Criar cliente Supabase
        print("Criando cliente Supabase...")
        supabase = create_client(supabase_url, supabase_key)
        print("Cliente Supabase criado com sucesso!")

        # Dados de teste
        test_data = {
            "nome": "TESTE SCRIPT - Verificação de Ambiente",
            "endereco": "Endereço de Teste Script",
            "equipamento": "Equipamento de Teste Script",
            "problema": "Problema de Teste - Verificação de Script",
            "urgente": False,
            "status": "teste",
            "tecnico": "Sistema (teste script)",
            "telefone": "11999999999",
            "cpf": "12345678900",
            "email": "teste@example.com",
            "origem": "teste_script"
        }

        # Inserir no Supabase
        print("Inserindo dados de teste no Supabase...")
        response = supabase.table("agendamentos_ai").insert(test_data).execute()

        # Verificar resposta
        try:
            # Usar model_dump() para versões mais recentes do Pydantic
            print(f"Resposta do Supabase: {json.dumps(response.model_dump(), indent=2)}")
        except AttributeError:
            # Fallback para dict() para versões mais antigas
            print(f"Resposta do Supabase: {json.dumps(response.dict(), indent=2)}")

        if response.data and len(response.data) > 0:
            print("Teste bem-sucedido! Dados inseridos com sucesso.")
            return True
        else:
            print("Aviso: Resposta vazia do Supabase.")
            return False

    except Exception as e:
        print(f"Erro ao testar conexão com Supabase: {str(e)}")
        return False

if __name__ == "__main__":
    print("Iniciando teste de conexão com Supabase...")
    result = test_supabase_connection()
    print(f"Resultado do teste: {'Sucesso' if result else 'Falha'}")
    sys.exit(0 if result else 1)
