import fs from 'fs';
import path from 'path';

console.log('🔍 Procurando por "Visita técnica padrão" em todo o projeto...\n');

const searchTerm = 'Visita técnica padrão';
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

function searchInFile(filePath, content) {
  const lines = content.split('\n');
  const matches = [];
  
  lines.forEach((line, index) => {
    if (line.includes(searchTerm)) {
      matches.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  return matches;
}

function searchInDirectory(dir, depth = 0) {
  if (depth > 5) return; // Evitar recursão muito profunda
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      if (excludeDirs.includes(file.name)) continue;
      
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        searchInDirectory(fullPath, depth + 1);
      } else if (file.name.match(/\.(ts|js|json|yml|yaml|txt|md)$/)) {
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
          // Ignorar erros de leitura
        }
      }
    }
  } catch (err) {
    // Ignorar erros de diretório
  }
}

try {
  searchInDirectory('.');
  console.log('✅ Busca concluída!');
} catch (err) {
  console.error('❌ Erro:', err.message);
}

process.exit(0);
