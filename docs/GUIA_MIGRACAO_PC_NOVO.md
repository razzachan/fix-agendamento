# 🖥️ GUIA DE MIGRAÇÃO PARA PC NOVO

## 📋 **CHECKLIST DE MIGRAÇÃO**

### **1. Preparação no PC Atual**
- [ ] Execute `backup_arquivos_importantes.bat`
- [ ] Copie a pasta de backup gerada
- [ ] Anote as variáveis de ambiente (Supabase, Mapbox)
- [ ] Faça backup do banco de dados (se local)
- [ ] Salve este arquivo: `PROJETO_RESUMO_COMPLETO.md`

### **2. Configuração no PC Novo**

#### **A. Instalar Ferramentas Básicas**
```bash
# Node.js (versão 18+)
# Baixar de: https://nodejs.org/

# Git
# Baixar de: https://git-scm.com/

# VS Code (recomendado)
# Baixar de: https://code.visualstudio.com/
```

#### **B. Clonar/Restaurar Projeto**
```bash
# Opção 1: Se tem repositório Git
git clone [url-do-repositorio]
cd eletro-fix-hub-pro

# Opção 2: Restaurar do backup
# Copie a pasta de backup para o novo PC
cd pasta-do-backup
```

#### **C. Instalar Dependências**
```bash
npm install
```

#### **D. Configurar Variáveis de Ambiente**
Crie arquivo `.env.local`:
```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
VITE_MAPBOX_TOKEN=seu_token_mapbox
```

#### **E. Testar Aplicação**
```bash
npm run dev
```

### **3. Verificações Importantes**

#### **A. Funcionalidades Críticas**
- [ ] Login/autenticação funciona
- [ ] Carregamento de agendamentos
- [ ] Sistema de calendário (cores corretas)
- [ ] Roteirização (apenas agendamentos ativos)
- [ ] Criação de OS a partir de agendamentos
- [ ] Dashboard de métricas

#### **B. Dados no Banco**
- [ ] Agendamentos carregando
- [ ] Ordens de serviço visíveis
- [ ] Técnicos listados
- [ ] Novos campos (processado, data_conversao) funcionando

### **4. Extensões VS Code Recomendadas**
```
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens
```

### **5. Comandos Úteis para Teste**
```bash
# Verificar versões
node --version
npm --version

# Limpar cache se necessário
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Build de produção
npm run build
```

---

## 🆘 **COMO CONTINUAR A CONVERSA NO PC NOVO**

### **Contexto para o Claude:**
Quando abrir uma nova conversa, use este prompt:

```
Olá! Sou o desenvolvedor do projeto Eletro Fix Hub Pro. 

Acabei de migrar para um PC novo e preciso continuar o desenvolvimento de onde paramos.

CONTEXTO DO PROJETO:
- Sistema de gestão para assistência técnica
- React + TypeScript + Supabase + Tailwind
- Implementamos recentemente:
  1. Sistema de calendário por slots de hora
  2. Sistema de reciclagem de dados (agendamentos → OS)
  3. Dashboard de métricas do ciclo de vida

ÚLTIMAS IMPLEMENTAÇÕES:
- Resolvemos problema de horários específicos vs slots
- Criamos sistema para evitar duplicação de agendamentos na roteirização
- Implementamos fluxo completo: agendamento → roteirização → confirmação → OS

ARQUIVOS PRINCIPAIS MODIFICADOS:
- src/services/agendamentos.ts (novos campos e métodos)
- src/services/orderLifecycle/OrderLifecycleService.ts (novo)
- src/components/dashboard/LifecycleDashboard.tsx (novo)
- src/hooks/useCalendarSchedule.ts (sistema de slots)

STATUS ATUAL:
- Sistema funcionando com dados de teste
- Cores do calendário corretas (azul=ocupado, amarelo=sugerido, verde=livre)
- Agendamentos convertidos não aparecem mais na roteirização

PRÓXIMO PASSO:
Preciso testar o fluxo completo com dados reais e verificar se tudo está funcionando no novo ambiente.

Você pode me ajudar a continuar de onde paramos?
```

### **Informações Técnicas para Compartilhar:**
- **Versão Node.js:** [verificar com `node --version`]
- **Versão do projeto:** v2.0 (com reciclagem de dados)
- **Banco:** Supabase
- **Status:** Sistema de calendário e reciclagem implementados

---

## 📞 **CONTATOS DE EMERGÊNCIA**

### **Documentação Oficial:**
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
- Supabase: https://supabase.com/docs
- Tailwind: https://tailwindcss.com/docs

### **Repositórios de Referência:**
- shadcn/ui: https://ui.shadcn.com/
- date-fns: https://date-fns.org/

---

## ✅ **CHECKLIST FINAL**

Antes de considerar a migração completa:

- [ ] Aplicação roda sem erros
- [ ] Todas as funcionalidades testadas
- [ ] Banco de dados conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do PC antigo mantido (por segurança)
- [ ] Documentação salva e acessível

**🎯 Objetivo:** Continuar desenvolvimento sem perder contexto ou funcionalidades implementadas.

---

**💡 Dica:** Mantenha este guia e o resumo do projeto sempre acessíveis para referência rápida!
