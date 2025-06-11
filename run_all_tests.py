import os
import sys
import subprocess
import time

def run_test(script_name, description):
    """
    Executa um script de teste e retorna o resultado.
    """
    print(f"\n{'=' * 80}")
    print(f"Executando teste: {description}")
    print(f"Script: {script_name}")
    print(f"{'-' * 80}")
    
    try:
        # Executar o script
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=True,
            text=True
        )
        
        # Exibir saída
        print(result.stdout)
        
        if result.stderr:
            print(f"STDERR: {result.stderr}")
        
        # Verificar resultado
        if result.returncode == 0:
            print(f"Teste concluído com sucesso!")
            return True
        else:
            print(f"Teste falhou com código de saída {result.returncode}")
            return False
    except Exception as e:
        print(f"Erro ao executar teste: {str(e)}")
        return False

def run_all_tests():
    """
    Executa todos os scripts de teste.
    """
    print("Iniciando execução de todos os testes...")
    
    # Lista de testes a serem executados
    tests = [
        ("update_supabase_schema.py", "Verificação e atualização do schema do Supabase"),
        ("test_supabase.py", "Teste de conexão com o Supabase"),
        ("test_clientechat.py", "Teste de integração com o Clientechat"),
        ("test_clientechat_real.py", "Teste com dados reais"),
        ("test_clientechat_exact.py", "Teste com formato exato do Clientechat"),
        ("test_clientechat_json.py", "Teste com formato JSON exato do Clientechat"),
        ("test_clientechat_template.py", "Teste com formato de template"),
        ("test_clientechat_template_exact.py", "Teste com formato de template exato do Clientechat")
    ]
    
    # Resultados
    results = {}
    
    # Executar cada teste
    for script, description in tests:
        # Verificar se o script existe
        if not os.path.exists(script):
            print(f"Aviso: Script {script} não encontrado. Pulando...")
            results[script] = False
            continue
        
        # Executar o teste
        results[script] = run_test(script, description)
        
        # Aguardar um pouco entre os testes
        time.sleep(1)
    
    # Exibir resumo
    print("\n\n")
    print("=" * 80)
    print("RESUMO DOS TESTES")
    print("=" * 80)
    
    success_count = 0
    for script, description in tests:
        result = results.get(script, False)
        status = "SUCESSO" if result else "FALHA"
        print(f"{status}: {description} ({script})")
        if result:
            success_count += 1
    
    print(f"\nTotal de testes: {len(tests)}")
    print(f"Testes bem-sucedidos: {success_count}")
    print(f"Testes com falha: {len(tests) - success_count}")
    
    # Retornar código de saída
    return 0 if success_count == len(tests) else 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
