# Suíte de testes

- Para rodar: `npm --prefix webhook-ai run test`
- Configuração: `vitest.config.ts` e `vitest.setup.ts`
- Dicas:
  - Use `MOCK_SUPABASE=true` se quiser isolar testes sem Supabase real
  - A API de orçamento é opcional em testes por causa do fallback offline

