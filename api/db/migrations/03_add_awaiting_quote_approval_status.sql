-- Adicionar novo status 'awaiting_quote_approval' ao enum de status
-- Este status representa quando um orçamento foi enviado e aguarda aprovação do cliente

-- 1. Adicionar o novo valor ao enum (se não existir)
DO $$ 
BEGIN
    -- Verificar se o valor já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'awaiting_quote_approval' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'service_order_status'
        )
    ) THEN
        -- Adicionar o novo valor ao enum
        ALTER TYPE service_order_status ADD VALUE 'awaiting_quote_approval';
        RAISE NOTICE 'Status awaiting_quote_approval adicionado com sucesso';
    ELSE
        RAISE NOTICE 'Status awaiting_quote_approval já existe';
    END IF;
END $$;

-- 2. Atualizar ordens que estão com 'quote_sent' para 'awaiting_quote_approval'
UPDATE service_orders 
SET status = 'awaiting_quote_approval' 
WHERE status = 'quote_sent';

-- 3. Comentário explicativo
COMMENT ON TYPE service_order_status IS 'Status das ordens de serviço. awaiting_quote_approval = aguardando aprovação do orçamento pelo cliente';
