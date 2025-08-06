/**
 * Script de teste para verificar a configuração do Google Ads API
 * Execute com: node test-google-ads-config.js
 */

// Simular environment variables para teste
process.env.GOOGLE_ADS_CLIENT_ID = 'SEU_CLIENT_ID_AQUI';
process.env.GOOGLE_ADS_CLIENT_SECRET = 'SEU_CLIENT_SECRET_AQUI';
process.env.GOOGLE_ADS_REFRESH_TOKEN = 'SEU_REFRESH_TOKEN_AQUI';
process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'PENDING_APPROVAL';
process.env.GOOGLE_ADS_CUSTOMER_ID = '2089607313';
process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '2089607313';

console.log('🚀 TESTE DE CONFIGURAÇÃO GOOGLE ADS API');
console.log('=' .repeat(50));

// Teste 1: Verificar variáveis de ambiente
console.log('\n📋 1. VERIFICANDO VARIÁVEIS DE AMBIENTE:');
const requiredVars = [
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET', 
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CUSTOMER_ID'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value && value !== 'PENDING_APPROVAL' ? 
    (value.length > 20 ? value.substring(0, 20) + '...' : value) : 
    value;
  console.log(`   ${status} ${varName}: ${displayValue || 'NÃO CONFIGURADO'}`);
});

// Teste 2: Verificar estrutura de configuração
console.log('\n⚙️ 2. TESTANDO ESTRUTURA DE CONFIGURAÇÃO:');

const googleAdsConfig = {
  clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'PENDING_APPROVAL',
  customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '2089607313',
  loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '2089607313',
  apiVersion: 'v16',
  baseUrl: 'https://googleads.googleapis.com',
};

console.log('   ✅ Configuração criada com sucesso');
console.log(`   📊 Customer ID: ${googleAdsConfig.customerId}`);
console.log(`   🔗 API Version: ${googleAdsConfig.apiVersion}`);
console.log(`   🌐 Base URL: ${googleAdsConfig.baseUrl}`);

// Teste 3: Validar configuração
console.log('\n🔍 3. VALIDANDO CONFIGURAÇÃO:');

const missingFields = [];
if (!googleAdsConfig.clientId) missingFields.push('CLIENT_ID');
if (!googleAdsConfig.clientSecret) missingFields.push('CLIENT_SECRET');
if (!googleAdsConfig.refreshToken) missingFields.push('REFRESH_TOKEN');
if (!googleAdsConfig.customerId) missingFields.push('CUSTOMER_ID');

const warnings = [];
if (!googleAdsConfig.developerToken || googleAdsConfig.developerToken === 'PENDING_APPROVAL') {
  warnings.push('Developer Token ainda não foi aprovado pelo Google');
}

const isValid = missingFields.length === 0;
console.log(`   ${isValid ? '✅' : '❌'} Configuração ${isValid ? 'válida' : 'inválida'}`);

if (missingFields.length > 0) {
  console.log(`   ❌ Campos obrigatórios faltando: ${missingFields.join(', ')}`);
}

if (warnings.length > 0) {
  console.log(`   ⚠️ Avisos:`);
  warnings.forEach(warning => console.log(`      - ${warning}`));
}

// Teste 4: Simular teste de OAuth (sem fazer requisição real)
console.log('\n🔐 4. SIMULANDO TESTE OAUTH:');

if (googleAdsConfig.clientId && googleAdsConfig.clientSecret && googleAdsConfig.refreshToken) {
  console.log('   ✅ Credenciais OAuth disponíveis');
  console.log('   🔗 URL OAuth: https://oauth2.googleapis.com/token');
  console.log('   📝 Grant Type: refresh_token');
  console.log('   ⚠️ Teste real será executado quando necessário');
} else {
  console.log('   ❌ Credenciais OAuth incompletas');
}

// Teste 5: Verificar URLs de configuração
console.log('\n🌐 5. URLS DE CONFIGURAÇÃO:');

const configUrls = {
  googleCloudConsole: 'https://console.cloud.google.com/apis/credentials',
  oauthPlayground: 'https://developers.google.com/oauthplayground/',
  googleAdsApiCenter: `https://ads.google.com/aw/apicenter?ocid=${googleAdsConfig.customerId}`,
  googleAdsConversions: `https://ads.google.com/aw/conversions?ocid=${googleAdsConfig.customerId}`,
  documentation: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
};

Object.entries(configUrls).forEach(([name, url]) => {
  console.log(`   🔗 ${name}: ${url}`);
});

// Teste 6: Status final
console.log('\n📊 6. STATUS FINAL:');

const canTestConnection = isValid && googleAdsConfig.developerToken !== 'PENDING_APPROVAL';
const canUploadConversions = canTestConnection; // Simplificado para o teste

console.log(`   ${isValid ? '✅' : '❌'} Configuração válida: ${isValid}`);
console.log(`   ${canTestConnection ? '✅' : '❌'} Pode testar conexão: ${canTestConnection}`);
console.log(`   ${canUploadConversions ? '✅' : '❌'} Pode enviar conversões: ${canUploadConversions}`);

// Próximos passos
console.log('\n🚀 PRÓXIMOS PASSOS:');

if (missingFields.length > 0) {
  console.log('   1. ⚙️ Configure as variáveis de ambiente no arquivo .env:');
  missingFields.forEach(field => {
    console.log(`      GOOGLE_ADS_${field}=seu_valor_aqui`);
  });
}

if (googleAdsConfig.developerToken === 'PENDING_APPROVAL') {
  console.log('   2. ⏳ Aguarde aprovação do Developer Token (3 dias úteis)');
}

if (isValid && canTestConnection) {
  console.log('   3. 🧪 Execute testes de conexão no sistema');
  console.log('   4. 🎯 Configure ações de conversão no Google Ads');
  console.log('   5. 🚀 Inicie o tracking automático');
}

console.log('\n' + '='.repeat(50));
console.log('✅ TESTE DE CONFIGURAÇÃO CONCLUÍDO');

// Exportar configuração para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    googleAdsConfig,
    isValid,
    canTestConnection,
    canUploadConversions,
    missingFields,
    warnings,
    configUrls
  };
}
