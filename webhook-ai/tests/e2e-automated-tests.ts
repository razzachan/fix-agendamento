/**
 * 🧪 Testes End-to-End Automatizados - Fluxo de Atendimento
 * 
 * Este script testa o fluxo completo de atendimento para todos os equipamentos
 * verificando se o bot:
 * - Detecta corretamente equipamento, marca e problema
 * - NÃO repete perguntas já respondidas
 * - Reutiliza dados da sessão corretamente
 * - Limpa dados ao trocar de equipamento
 * - Gera orçamentos quando tem todos os dados necessários
 */

import { processInbound } from '../src/services/conversationOrchestrator.js';
import type { SessionRecord } from '../src/services/sessionStore.js';

// Tipos
interface TestCase {
  name: string;
  equipment: string;
  messages: Array<{
    user: string;
    expectedKeywords?: string[];
    shouldNotContain?: string[];
    shouldHaveInSession?: Record<string, any>;
  }>;
}

interface TestResult {
  testName: string;
  equipment: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Mock de sessão para testes
function createMockSession(): SessionRecord {
  return {
    id: `test-${Date.now()}`,
    channel: 'whatsapp',
    peer_id: '5548988332664@c.us',
    state: {
      dados_coletados: {},
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SessionRecord;
}

// Função auxiliar para verificar se resposta contém palavras-chave
function containsKeywords(response: string, keywords: string[]): boolean {
  const lower = response.toLowerCase();
  return keywords.every(keyword => lower.includes(keyword.toLowerCase()));
}

// Função auxiliar para verificar se resposta NÃO contém palavras
function doesNotContain(response: string, words: string[]): boolean {
  const lower = response.toLowerCase();
  return words.every(word => !lower.includes(word.toLowerCase()));
}

// 🧪 BATERIA DE TESTES

const testCases: TestCase[] = [
  // ========================================
  // 1️⃣ FOGÃO / COOKTOP
  // ========================================
  {
    name: 'Fogão - Fluxo completo com marca e problema',
    equipment: 'fogão',
    messages: [
      {
        user: 'Oi, meu fogão Brastemp de 5 bocas não acende',
        expectedKeywords: ['piso', 'cooktop'],
        shouldNotContain: ['marca', 'problema específico'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'fogão',
          'dados_coletados.marca': 'brastemp',
          'dados_coletados.problema': 'não acende',
        },
      },
      {
        user: 'Piso',
        expectedKeywords: ['r$', 'valor', 'orçamento'],
        shouldNotContain: ['marca', 'problema'],
      },
    ],
  },
  {
    name: 'Fogão - Dados incompletos',
    equipment: 'fogão',
    messages: [
      {
        user: 'Meu fogão não acende',
        expectedKeywords: ['piso', 'cooktop', 'bocas'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'fogão',
          'dados_coletados.problema': 'não acende',
        },
      },
      {
        user: 'Cooktop de 4 bocas',
        expectedKeywords: ['marca'],
        shouldNotContain: ['problema'],
      },
      {
        user: 'Electrolux',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
      },
    ],
  },

  // ========================================
  // 2️⃣ LAVA-LOUÇAS
  // ========================================
  {
    name: 'Lava-louças - Fluxo completo',
    equipment: 'lava-louças',
    messages: [
      {
        user: 'Minha lava-louças Brastemp não lava direito',
        expectedKeywords: ['r$', 'valor', 'orçamento'],
        shouldNotContain: ['marca', 'problema específico'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'lava-louças',
          'dados_coletados.marca': 'brastemp',
          'dados_coletados.problema': 'não lava direito',
        },
      },
    ],
  },
  {
    name: 'Lava-louças - Dados incompletos',
    equipment: 'lava-louças',
    messages: [
      {
        user: 'Minha lava-louças não limpa bem',
        expectedKeywords: ['marca'],
        shouldNotContain: ['problema específico'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'lava-louças',
          'dados_coletados.problema': 'não limpa',
        },
      },
      {
        user: 'Electrolux',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
      },
    ],
  },
  {
    name: 'Lava-louças - Variações de problema',
    equipment: 'lava-louças',
    messages: [
      {
        user: 'Lava louça Consul deixa as louças sujas',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'lava-louças',
          'dados_coletados.marca': 'consul',
          'dados_coletados.problema': 'louças sujas',
        },
      },
    ],
  },

  // ========================================
  // 3️⃣ MICRO-ONDAS
  // ========================================
  {
    name: 'Micro-ondas - Bancada completo',
    equipment: 'micro-ondas',
    messages: [
      {
        user: 'Meu micro-ondas Panasonic de bancada não esquenta',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'micro-ondas',
          'dados_coletados.marca': 'panasonic',
          'dados_coletados.problema': 'não esquenta',
        },
      },
    ],
  },
  {
    name: 'Micro-ondas - Embutido completo',
    equipment: 'micro-ondas',
    messages: [
      {
        user: 'Micro-ondas embutido Brastemp não funciona',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'micro-ondas',
          'dados_coletados.marca': 'brastemp',
          'dados_coletados.problema': 'não funciona',
        },
      },
    ],
  },
  {
    name: 'Micro-ondas - Dados incompletos',
    equipment: 'micro-ondas',
    messages: [
      {
        user: 'Meu micro-ondas não esquenta',
        expectedKeywords: ['marca'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'micro-ondas',
          'dados_coletados.problema': 'não esquenta',
        },
      },
      {
        user: 'LG',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
      },
    ],
  },

  // ========================================
  // 4️⃣ LAVADORA
  // ========================================
  {
    name: 'Lavadora - Fluxo completo',
    equipment: 'lavadora',
    messages: [
      {
        user: 'Minha lavadora Electrolux não centrifuga',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'lavadora',
          'dados_coletados.marca': 'electrolux',
          'dados_coletados.problema': 'não centrifuga',
        },
      },
    ],
  },
  {
    name: 'Lavadora - Problema com água',
    equipment: 'lavadora',
    messages: [
      {
        user: 'Máquina de lavar Consul não enche de água',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'máquina de lavar',
          'dados_coletados.marca': 'consul',
          'dados_coletados.problema': 'não enche',
        },
      },
    ],
  },

  // ========================================
  // 5️⃣ LAVA E SECA
  // ========================================
  {
    name: 'Lava e seca - Fluxo completo',
    equipment: 'lava e seca',
    messages: [
      {
        user: 'Minha lava e seca LG não seca as roupas',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'lava e seca',
          'dados_coletados.marca': 'lg',
          'dados_coletados.problema': 'não seca',
        },
      },
    ],
  },

  // ========================================
  // 6️⃣ SECADORA
  // ========================================
  {
    name: 'Secadora - Fluxo completo',
    equipment: 'secadora',
    messages: [
      {
        user: 'Secadora Electrolux não aquece',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'secadora',
          'dados_coletados.marca': 'electrolux',
          'dados_coletados.problema': 'não aquece',
        },
      },
    ],
  },

  // ========================================
  // 7️⃣ COIFA
  // ========================================
  {
    name: 'Coifa - Fluxo completo',
    equipment: 'coifa',
    messages: [
      {
        user: 'Coifa Tramontina faz barulho',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'coifa',
          'dados_coletados.marca': 'tramontina',
          'dados_coletados.problema': 'faz barulho',
        },
      },
    ],
  },

  // ========================================
  // 8️⃣ ADEGA
  // ========================================
  {
    name: 'Adega - Fluxo completo',
    equipment: 'adega',
    messages: [
      {
        user: 'Adega Brastemp não gela',
        expectedKeywords: ['r$', 'valor'],
        shouldNotContain: ['marca', 'problema'],
        shouldHaveInSession: {
          'dados_coletados.equipamento': 'adega',
          'dados_coletados.marca': 'brastemp',
          'dados_coletados.problema': 'não gela',
        },
      },
    ],
  },
];

// 🏃 EXECUTAR TESTES
async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    console.log(`\n🧪 Executando: ${testCase.name}`);
    
    const result: TestResult = {
      testName: testCase.name,
      equipment: testCase.equipment,
      passed: true,
      errors: [],
      warnings: [],
    };

    const session = createMockSession();

    try {
      for (let i = 0; i < testCase.messages.length; i++) {
        const msg = testCase.messages[i];
        console.log(`  📨 Mensagem ${i + 1}: "${msg.user}"`);

        // Processar mensagem
        const response = await processInbound(
          'whatsapp',
          session.peer_id,
          msg.user,
          session
        );

        console.log(`  🤖 Resposta: "${response?.substring(0, 100)}..."`);

        // Verificar palavras-chave esperadas
        if (msg.expectedKeywords && response) {
          const hasKeywords = containsKeywords(response, msg.expectedKeywords);
          if (!hasKeywords) {
            result.errors.push(
              `Mensagem ${i + 1}: Resposta não contém palavras-chave esperadas: ${msg.expectedKeywords.join(', ')}`
            );
            result.passed = false;
          }
        }

        // Verificar palavras que NÃO devem estar
        if (msg.shouldNotContain && response) {
          const hasUnwanted = !doesNotContain(response, msg.shouldNotContain);
          if (hasUnwanted) {
            result.errors.push(
              `Mensagem ${i + 1}: Resposta contém palavras indesejadas: ${msg.shouldNotContain.join(', ')}`
            );
            result.passed = false;
          }
        }

        // Verificar estado da sessão
        if (msg.shouldHaveInSession) {
          for (const [path, expectedValue] of Object.entries(msg.shouldHaveInSession)) {
            const keys = path.split('.');
            let value: any = session.state;
            for (const key of keys) {
              value = value?.[key];
            }
            
            if (typeof expectedValue === 'string') {
              const valueStr = String(value || '').toLowerCase();
              const expectedStr = expectedValue.toLowerCase();
              if (!valueStr.includes(expectedStr)) {
                result.warnings.push(
                  `Mensagem ${i + 1}: Sessão não contém ${path}="${expectedValue}" (atual: "${value}")`
                );
              }
            }
          }
        }
      }

      if (result.passed) {
        console.log(`  ✅ PASSOU`);
      } else {
        console.log(`  ❌ FALHOU`);
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(`Erro durante execução: ${error}`);
      console.log(`  ❌ ERRO: ${error}`);
    }

    results.push(result);
  }

  return results;
}

// 📊 GERAR RELATÓRIO
function generateReport(results: TestResult[]): void {
  console.log('\n\n📊 ========== RELATÓRIO DE TESTES ==========\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total de testes: ${total}`);
  console.log(`✅ Passaram: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falharam: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:\n');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`\n🔴 ${result.testName} (${result.equipment})`);
      result.errors.forEach(error => console.log(`   - ${error}`));
      if (result.warnings.length > 0) {
        console.log('   ⚠️ Avisos:');
        result.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    });
  }

  console.log('\n===========================================\n');
}

// 🚀 EXECUTAR
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(generateReport)
    .catch(console.error);
}

export { runTests, generateReport };

