#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teste da função calcular_valor_servico
"""

import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def calcular_valor_servico(tipo_atendimento: str, equipamentos: list, problemas: list) -> float:
    """
    Calcula o valor do serviço baseado no tipo de atendimento, equipamentos e problemas
    """
    logger.info(f"🧮 Calculando valor para: tipo={tipo_atendimento}, equipamentos={equipamentos}, problemas={problemas}")
    
    # Valores base por tipo de atendimento
    valores_base = {
        "em_domicilio": 150.00,      # Serviço em domicílio
        "coleta_diagnostico": 80.00,  # Taxa de coleta para diagnóstico
        "coleta_conserto": 120.00     # Taxa de coleta para conserto
    }
    
    valor_base = valores_base.get(tipo_atendimento, 150.00)
    logger.info(f"💰 Valor base para {tipo_atendimento}: R$ {valor_base}")
    
    # Multiplicadores por tipo de equipamento
    multiplicadores_equipamento = {
        "fogão": 1.0,
        "forno": 1.2,
        "cooktop": 1.1,
        "coifa": 0.9,
        "depurador": 0.8,
        "lava-louça": 1.3,
        "micro-ondas": 1.1
    }
    
    # Calcular multiplicador baseado nos equipamentos
    multiplicador_total = 1.0
    for equipamento in equipamentos:
        equipamento_lower = equipamento.lower()
        for tipo, mult in multiplicadores_equipamento.items():
            if tipo in equipamento_lower:
                multiplicador_total = max(multiplicador_total, mult)
                logger.info(f"📈 Equipamento '{equipamento}' -> multiplicador {mult}")
                break
    
    # Ajustes por complexidade do problema
    palavras_complexas = [
        "não liga", "não aquece", "não funciona", "queimado", "curto",
        "elétrico", "fiação", "placa", "display", "eletrônico"
    ]
    
    ajuste_complexidade = 1.0
    for problema in problemas:
        problema_lower = problema.lower()
        for palavra in palavras_complexas:
            if palavra in problema_lower:
                ajuste_complexidade = 1.15  # 15% a mais para problemas complexos
                logger.info(f"🔧 Problema complexo detectado: '{problema}' -> ajuste +15%")
                break
    
    # Calcular valor final
    valor_final = valor_base * multiplicador_total * ajuste_complexidade
    
    # Arredondar para múltiplos de 10
    valor_final = round(valor_final / 10) * 10
    
    logger.info(f"✅ Valor calculado: R$ {valor_base} × {multiplicador_total} × {ajuste_complexidade} = R$ {valor_final}")
    
    return valor_final

def testar_cenarios():
    """
    Testa diferentes cenários de cálculo de valor
    """
    print("🧪 TESTANDO FUNÇÃO DE CÁLCULO DE VALOR\n")
    
    cenarios = [
        {
            "nome": "Fogão em domicílio - problema simples",
            "tipo": "em_domicilio",
            "equipamentos": ["Fogão 4 bocas"],
            "problemas": ["Boca não acende"]
        },
        {
            "nome": "Forno em domicílio - problema complexo",
            "tipo": "em_domicilio", 
            "equipamentos": ["Forno elétrico"],
            "problemas": ["Não aquece e display não funciona"]
        },
        {
            "nome": "Lava-louça coleta diagnóstico",
            "tipo": "coleta_diagnostico",
            "equipamentos": ["Lava-louça"],
            "problemas": ["Não liga"]
        },
        {
            "nome": "Cooktop coleta conserto",
            "tipo": "coleta_conserto",
            "equipamentos": ["Cooktop indução"],
            "problemas": ["Queimado"]
        },
        {
            "nome": "Micro-ondas em domicílio",
            "tipo": "em_domicilio",
            "equipamentos": ["Micro-ondas"],
            "problemas": ["Não aquece"]
        },
        {
            "nome": "Coifa em domicílio",
            "tipo": "em_domicilio",
            "equipamentos": ["Coifa"],
            "problemas": ["Motor com ruído"]
        }
    ]
    
    for i, cenario in enumerate(cenarios, 1):
        print(f"📋 CENÁRIO {i}: {cenario['nome']}")
        print("-" * 50)
        
        valor = calcular_valor_servico(
            cenario['tipo'],
            cenario['equipamentos'], 
            cenario['problemas']
        )
        
        print(f"🎯 RESULTADO: R$ {valor:.2f}")
        print()

if __name__ == "__main__":
    testar_cenarios()
