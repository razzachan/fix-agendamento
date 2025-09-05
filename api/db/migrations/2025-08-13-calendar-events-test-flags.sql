-- Add test flags to calendar_events for safe bot studio testing
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS source text;

-- Optional: index to speed up availability queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events (start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_test ON calendar_events (is_test);

