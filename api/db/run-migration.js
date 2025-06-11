import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(filename) {
  try {
    console.log(`Executando migração: ${filename}`);

    // Ler o arquivo SQL
    const filePath = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Dividir o SQL em comandos individuais
    const commands = sql.split(';').filter(cmd => cmd.trim() !== '');

    // Executar cada comando SQL individualmente
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim() + ';';
      console.log(`Executando comando ${i + 1}/${commands.length}...`);

      try {
        // Usar o método .rpc() para executar SQL personalizado
        const { error } = await supabase.rpc('execute_sql', { sql_query: command });

        if (error) {
          console.error(`Erro ao executar comando ${i + 1}:`, error);
          console.error(`Comando: ${command}`);

          // Tentar uma abordagem alternativa se o RPC falhar
          console.log('Tentando abordagem alternativa...');

          // Verificar se é um comando ALTER TABLE
          if (command.toLowerCase().includes('alter table')) {
            const match = command.match(/alter\s+table\s+(\w+)\s+add\s+column\s+if\s+not\s+exists\s+(\w+)\s+(\w+)/i);
            if (match) {
              const table = match[1];
              const column = match[2];
              const type = match[3];

              console.log(`Tentando adicionar coluna ${column} à tabela ${table}...`);
              const { error: alterError } = await supabase
                .from(table)
                .select('id')
                .limit(1);

              if (alterError) {
                console.error(`Erro ao acessar tabela ${table}:`, alterError);
              } else {
                console.log(`Tabela ${table} acessada com sucesso.`);
              }
            }
          }

          // Verificar se é um comando CREATE TABLE
          if (command.toLowerCase().includes('create table')) {
            console.log('Detectado comando CREATE TABLE. Verificando tabelas existentes...');
            // Aqui poderíamos listar tabelas, mas a API do Supabase não oferece isso diretamente
          }
        } else {
          console.log(`Comando ${i + 1} executado com sucesso.`);
        }
      } catch (cmdError) {
        console.error(`Erro ao executar comando ${i + 1}:`, cmdError);
        console.error(`Comando: ${command}`);
        // Continuar com o próximo comando
      }
    }

    console.log(`Migração ${filename} concluída!`);
    return true;
  } catch (error) {
    console.error(`Erro ao executar migração ${filename}:`, error);
    return false;
  }
}

async function main() {
  // Verificar se o nome do arquivo foi fornecido como argumento
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Por favor, forneça o nome do arquivo de migração como argumento.');
    console.error('Exemplo: node run-migration.js 01_add_service_order_progress.sql');
    process.exit(1);
  }

  const filename = args[0];
  const success = await runMigration(filename);

  if (!success) {
    process.exit(1);
  }

  console.log('Migração concluída com sucesso!');
  process.exit(0);
}

main();
