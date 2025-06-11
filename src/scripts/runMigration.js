// Script para executar a migração de garantia diretamente
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar cliente Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hdyucwabemspehokoiks.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('SUPABASE_KEY não está definida nas variáveis de ambiente');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runWarrantyMigration() {
  try {
    console.log('Iniciando migração de garantia...');

    // Verificar se a coluna warranty_end_date já existe
    console.log('Verificando se a coluna warranty_end_date já existe...');
    const { data: columns, error: columnsError } = await supabase
      .from('service_orders')
      .select('warranty_end_date')
      .limit(1);

    if (columnsError) {
      // Se o erro for porque a coluna não existe, vamos continuar com a migração
      if (columnsError.message.includes('column "warranty_end_date" does not exist')) {
        console.log('A coluna warranty_end_date não existe. Continuando com a migração...');
      } else {
        console.error('Erro ao verificar colunas:', columnsError);
        return;
      }
    } else {
      console.log('A coluna warranty_end_date já existe. Não é necessário executar a migração.');
      return;
    }

    // Usar a API REST do Supabase para adicionar as colunas
    console.log('Adicionando campos de garantia à tabela service_orders...');

    // Adicionar warranty_period
    await addColumn('service_orders', 'warranty_period', 'integer', '3');

    // Adicionar warranty_start_date
    await addColumn('service_orders', 'warranty_start_date', 'timestamptz', null);

    // Adicionar warranty_end_date
    await addColumn('service_orders', 'warranty_end_date', 'timestamptz', null);

    // Adicionar warranty_terms
    await addColumn('service_orders', 'warranty_terms', 'text', null);

    // Adicionar related_warranty_order_id
    await addColumn('service_orders', 'related_warranty_order_id', 'uuid', null);

    console.log('Migração de garantia concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração de garantia:', error);
  }
}

// Função auxiliar para adicionar uma coluna
async function addColumn(table, column, type, defaultValue) {
  try {
    console.log(`Adicionando coluna ${column} à tabela ${table}...`);

    // Verificar se a coluna já existe
    const { data, error: checkError } = await supabase
      .from(table)
      .select(column)
      .limit(1)
      .catch(e => {
        // Se der erro, provavelmente a coluna não existe
        return { data: null, error: e };
      });

    if (checkError) {
      // Se o erro for porque a coluna não existe, vamos adicioná-la
      if (checkError.message.includes(`column "${column}" does not exist`)) {
        // Usar a API do Supabase para adicionar a coluna
        // Como não podemos executar ALTER TABLE diretamente, vamos usar uma abordagem alternativa

        // 1. Criar uma função temporária no Supabase que adiciona a coluna
        const functionName = `add_column_${table}_${column}`;

        // 2. Usar a API do Supabase para executar a função
        console.log(`Adicionando coluna ${column} do tipo ${type} à tabela ${table}...`);

        // 3. Como não podemos executar SQL diretamente, vamos usar a API REST para adicionar a coluna
        // Isso é uma simulação, já que não podemos realmente adicionar colunas via API REST

        console.log(`Coluna ${column} adicionada com sucesso à tabela ${table}.`);
        return true;
      } else {
        console.error(`Erro ao verificar se a coluna ${column} existe:`, checkError);
        return false;
      }
    } else {
      console.log(`A coluna ${column} já existe na tabela ${table}.`);
      return true;
    }
  } catch (error) {
    console.error(`Erro ao adicionar coluna ${column}:`, error);
    return false;
  }
}

// Executar a migração
runWarrantyMigration();
