-- Add service_attendance_type to calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS service_attendance_type VARCHAR(50);

-- Optional: backfill from legacy column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='calendar_events' AND column_name='tipo_servico'
  ) THEN
    EXECUTE 'UPDATE calendar_events SET service_attendance_type = tipo_servico WHERE service_attendance_type IS NULL';
  END IF;
END$$;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_service_attendance_type ON calendar_events(service_attendance_type);

