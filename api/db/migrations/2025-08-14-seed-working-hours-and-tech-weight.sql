-- Add technicians.weight for assignment ordering
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS weight INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_technicians_weight ON technicians(weight);

-- Seed working_hours (Mon-Fri) 08:00-18:00 if missing
INSERT INTO working_hours (weekday, start_time, end_time)
SELECT 1, '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE weekday=1);

INSERT INTO working_hours (weekday, start_time, end_time)
SELECT 2, '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE weekday=2);

INSERT INTO working_hours (weekday, start_time, end_time)
SELECT 3, '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE weekday=3);

INSERT INTO working_hours (weekday, start_time, end_time)
SELECT 4, '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE weekday=4);

INSERT INTO working_hours (weekday, start_time, end_time)
SELECT 5, '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM working_hours WHERE weekday=5);

