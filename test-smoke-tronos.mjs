import 'dotenv/config'

async function main(){
  const base = 'http://localhost:3100'
  
  // Habilitar test-mode
  try {
    const res = await fetch(`${base}/test-mode/enable`, { method: 'POST' })
    if (!res.ok) throw new Error(`test-mode enable status ${res.status}`)
    console.log('✅ Test-mode habilitado')
  } catch (e) {
    console.warn('⚠️ Falha ao habilitar test-mode:', e?.message || e)
  }

  // Testar mensagem com marca desconhecida e problema detalhado
  const testMessage = {
    from: '5599999999999',
    body: 'Tenho um fogão de indução da marca Tronos, quando liga sai uma leve fumaça por baixo e cheiro de queimado, vocês consertam?'
  }

  console.log('\n🧪 Testando mensagem:', testMessage.body)
  
  try {
    const res = await fetch(`${base}/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`HTTP ${res.status}: ${errorText}`)
    }
    
    const data = await res.json()
    
    console.log('\n📤 Resposta do bot:')
    console.log('---')
    console.log(data.reply || 'Sem resposta')
    console.log('---')
    
    // Verificar se capturou marca e problema
    const reply = String(data.reply || '')
    const capturedBrand = reply.includes('Tronos') || reply.includes('marca')
    const capturedProblem = reply.includes('fumaça') || reply.includes('queimado') || reply.includes('problema')
    const hasQuote = reply.includes('R$') || reply.includes('valor') || reply.includes('orçamento')
    
    console.log('\n🔍 Análise:')
    console.log(`- Marca capturada: ${capturedBrand ? '✅' : '❌'}`)
    console.log(`- Problema capturado: ${capturedProblem ? '✅' : '❌'}`)
    console.log(`- Orçamento gerado: ${hasQuote ? '✅' : '❌'}`)
    
    if (capturedBrand && capturedProblem && hasQuote) {
      console.log('\n🎉 SUCESSO: Bot processou marca desconhecida e problema detalhado!')
    } else {
      console.log('\n❌ FALHA: Bot não processou adequadamente a mensagem')
    }
    
  } catch (e) {
    console.error('\n💥 Erro no teste:', e?.message || e)
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Erro fatal:', e)
  process.exit(1)
})
