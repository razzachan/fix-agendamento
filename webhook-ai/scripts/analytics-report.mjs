import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Placeholder: gera um relatório sintético até conectarmos Supabase de verdade
const report = {
  period: 'last_week',
  totals: {
    sessions: 42,
    successful_quotes: 31,
    schedules_started: 19,
    schedules_confirmed: 11,
  },
  insights: [
    'Melhorar a frase de saudação aumentou o engajamento em 6%',
    'Usuários respondem mais quando pedimos bairro/CEP explicitamente',
  ],
}

const outDir = path.join(__dirname, '../../.reports')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'weekly-report.json'), JSON.stringify(report, null, 2))
console.log('Report written to .reports/weekly-report.json')

