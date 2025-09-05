require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Obter argumentos da linha de comando
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Por favor, forneça o nome do arquivo de migração como argumento.');
  process.exit(1);
}

// Configurar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) devem estar definidas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Executando migração: ${migrationFile}`);
    
    // Executar a migração
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Erro ao executar migração:', error);
      process.exit(1);
    }
    
    console.log(`Migração ${migrationFile} executada com sucesso!`);
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }
}

runMigration();
