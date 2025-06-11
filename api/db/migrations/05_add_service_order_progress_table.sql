-- Criar tabela de progresso de ordens de serviço
CREATE TABLE IF NOT EXISTS public.service_order_progress (
    id UUID PRIMARY KEY,
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    CONSTRAINT fk_service_order FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE CASCADE
);

-- Criar índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_service_order_progress_service_order_id ON public.service_order_progress(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_order_progress_created_at ON public.service_order_progress(created_at);

-- Adicionar comentários para documentação
COMMENT ON TABLE public.service_order_progress IS 'Histórico de progresso das ordens de serviço';
COMMENT ON COLUMN public.service_order_progress.id IS 'Identificador único do registro de progresso';
COMMENT ON COLUMN public.service_order_progress.service_order_id IS 'Referência à ordem de serviço';
COMMENT ON COLUMN public.service_order_progress.status IS 'Status da ordem de serviço no momento do registro';
COMMENT ON COLUMN public.service_order_progress.notes IS 'Observações sobre a mudança de status';
COMMENT ON COLUMN public.service_order_progress.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.service_order_progress.created_by IS 'Usuário que criou o registro';
