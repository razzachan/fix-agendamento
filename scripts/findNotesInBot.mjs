import fs from 'fs';
import path from 'path';

console.log('🔍 Procurando por "notes" no código do bot...\n');

const searchDir = 'webhook-ai/src';
const searchTerm = 'notes';

function searchInFile(filePath, content) {
  const lines = content.split('\n');
  const matches = [];
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
      matches.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  return matches;
}

function searchInDirectory(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      searchInDirectory(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = searchInFile(fullPath, content);
        
        if (matches.length > 0) {
          console.log(`📄 ${fullPath}:`);
          matches.forEach(match => {
            console.log(`   Linha ${match.line}: ${match.content}`);
          });
          console.log('');
        }
      } catch (err) {
        console.log(`❌ Erro ao ler ${fullPath}: ${err.message}`);
      }
    }
  }
}

try {
  searchInDirectory(searchDir);
  console.log('✅ Busca concluída!');
} catch (err) {
  console.error('❌ Erro:', err.message);
}

process.exit(0);
