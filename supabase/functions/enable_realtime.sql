
-- Enable full replication identity for the clients table
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- Add clients table to the realtime publication
BEGIN;
  -- Create the publication if it doesn't exist
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
COMMIT;
