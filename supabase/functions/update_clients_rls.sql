
-- Adicionar políticas RLS para permitir leitura dos clientes por qualquer usuário autenticado
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de todos os clientes (temporário para facilitar diagnóstico)
CREATE POLICY "Allow select for all authenticated users" 
ON public.clients FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir inserção de clientes por qualquer usuário autenticado
CREATE POLICY "Allow insert for all authenticated users" 
ON public.clients FOR INSERT 
TO authenticated 
WITH CHECK (true);

