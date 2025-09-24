// Script para remover a variável PUPPETEER_EXECUTABLE_PATH do Railway
const https = require('https');

const serviceId = 'd3edae76-7a4c-4361-a21d-0b0512a0a7d2';
const environmentId = '4d7d0fae-c2f2-42b8-af49-5cb1c0eeb477';

// Função para fazer requisições GraphQL (sem autenticação para teste)
function makeGraphQLRequest(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: 'backboard.railway.app',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function listVariables() {
  try {
    console.log('1. Listando variáveis...');

    // Primeiro, listar todas as variáveis
    const listQuery = `
      query {
        variables(serviceId: "${serviceId}", environmentId: "${environmentId}") {
          edges {
            node {
              id
              name
              value
            }
          }
        }
      }
    `;

    const listResponse = await makeGraphQLRequest(listQuery);

    if (listResponse.errors) {
      console.error('Erro ao listar variáveis:', listResponse.errors);
      return;
    }

    if (!listResponse.data || !listResponse.data.variables) {
      console.log('Resposta inesperada:', JSON.stringify(listResponse, null, 2));
      return;
    }

    const variables = listResponse.data.variables.edges;
    console.log(`Encontradas ${variables.length} variáveis:`);

    // Listar todas as variáveis
    variables.forEach(v => {
      console.log(`- ${v.node.name}: ${v.node.value.substring(0, 30)}...`);
    });

    // Encontrar a variável PUPPETEER_EXECUTABLE_PATH
    const puppeteerVar = variables.find(v => v.node.name === 'PUPPETEER_EXECUTABLE_PATH');

    if (!puppeteerVar) {
      console.log('\nVariável PUPPETEER_EXECUTABLE_PATH não encontrada');
      return;
    }

    console.log(`\n2. Encontrada variável PUPPETEER_EXECUTABLE_PATH:`);
    console.log(`   ID: ${puppeteerVar.node.id}`);
    console.log(`   Valor: ${puppeteerVar.node.value}`);

    return puppeteerVar;

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  listVariables();
}

module.exports = { listVariables };
