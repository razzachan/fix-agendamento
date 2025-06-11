-- Adicionar campo order_number à tabela service_orders
-- Este campo armazenará a numeração sequencial amigável (ex: "OS #001")

-- 1. Adicionar o campo order_number
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) UNIQUE;

-- 2. Criar sequência para numeração automática
CREATE SEQUENCE IF NOT EXISTS service_order_number_seq START 1;

-- 3. Criar função para gerar número sequencial
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Obter próximo número da sequência
    SELECT nextval('service_order_number_seq') INTO next_number;
    
    -- Formatar como "OS #001"
    formatted_number := 'OS #' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para gerar order_number automaticamente
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Se order_number não foi fornecido, gerar automaticamente
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger que executa antes do INSERT
DROP TRIGGER IF EXISTS trigger_set_order_number ON service_orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- 6. Atualizar registros existentes com numeração sequencial
-- Primeiro, vamos verificar se existem registros sem order_number
DO $$
DECLARE
    record_count INTEGER;
    current_record RECORD;
    counter INTEGER := 1;
BEGIN
    -- Contar registros sem order_number
    SELECT COUNT(*) INTO record_count 
    FROM service_orders 
    WHERE order_number IS NULL;
    
    -- Se existem registros, atualizar com numeração sequencial
    IF record_count > 0 THEN
        RAISE NOTICE 'Atualizando % registros existentes com numeração sequencial...', record_count;
        
        -- Atualizar registros ordenados por created_at
        FOR current_record IN 
            SELECT id 
            FROM service_orders 
            WHERE order_number IS NULL 
            ORDER BY created_at ASC
        LOOP
            UPDATE service_orders 
            SET order_number = 'OS #' || LPAD(counter::TEXT, 3, '0')
            WHERE id = current_record.id;
            
            counter := counter + 1;
        END LOOP;
        
        -- Ajustar a sequência para o próximo número
        PERFORM setval('service_order_number_seq', counter);
        
        RAISE NOTICE 'Numeração sequencial aplicada com sucesso!';
    ELSE
        RAISE NOTICE 'Nenhum registro encontrado para atualizar.';
    END IF;
END $$;

-- 7. Criar índice para melhorar performance de consultas por order_number
CREATE INDEX IF NOT EXISTS idx_service_orders_order_number ON service_orders(order_number);

-- 8. Comentários para documentação
COMMENT ON COLUMN service_orders.order_number IS 'Número sequencial amigável da ordem de serviço (ex: OS #001)';
COMMENT ON SEQUENCE service_order_number_seq IS 'Sequência para geração automática de números de ordem';
COMMENT ON FUNCTION generate_order_number() IS 'Gera número sequencial formatado para ordens de serviço';
COMMENT ON FUNCTION set_order_number() IS 'Trigger function para definir order_number automaticamente';
