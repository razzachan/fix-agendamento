-- Add client_email and client_cpf_cnpj to calendar_events (if missing)
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_cpf_cnpj TEXT;

-- Optional indexes (lightweight)
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_email ON calendar_events(client_email);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_cpf_cnpj ON calendar_events(client_cpf_cnpj);

