import { execSync } from 'node:child_process'
import fs from 'fs'

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString('utf8').trim()
}

const branch = 'chore/copy-tweaks-' + Date.now()
sh(`git checkout -b ${branch}`)

// Sugestão simples: ajustar greetingFallback para teste A/B
const file = 'webhook-ai/src/services/copy.ts'
let content = fs.readFileSync(file, 'utf8')
content = content.replace(
  "greetingFallback: 'Olá, farei seu atendimento. Como posso ajudar?',",
  "greetingFallback: 'Olá! Sou da Fix. Prefere orçamento rápido ou já quer agendar?',",
)
fs.writeFileSync(file, content)

sh('git add webhook-ai/src/services/copy.ts')
sh('git commit -m "copy: tweak greeting fallback for engagement A/B"')
const remote = sh('git remote get-url origin')
const prTitle = 'copy: tweak greeting fallback for engagement A/B'
sh(`git push -u origin ${branch}`)

// Cria PR via gh CLI se disponível; fallback instruções
try {
  sh(`gh pr create --title "${prTitle}" --body "Auto-proposed copy tweak. Weekly analytics pipeline." --base main --head ${branch}`)
  console.log('PR opened via gh CLI')
} catch {
  console.log('gh CLI not available. Please open a PR manually for branch:', branch)
}

