-- Fix: prevent recalculation from raising score for final statuses.
-- When a lead is marked as 'perdido'/'cancelado', it should have a low score.
-- When a lead is 'entregue', it should have a max score.

CREATE OR REPLACE FUNCTION recalculate_lead_score(lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  lead_record RECORD;
  score INTEGER := 50;
  hours_since_last NUMERIC;
BEGIN
  SELECT * INTO lead_record FROM pre_schedules WHERE id = lead_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Final statuses have fixed scores
  IF lead_record.crm_status IN ('perdido', 'cancelado') THEN
    UPDATE pre_schedules SET crm_score = 10 WHERE id = lead_id;
    RETURN 10;
  END IF;

  IF lead_record.crm_status = 'entregue' THEN
    UPDATE pre_schedules SET crm_score = 100 WHERE id = lead_id;
    RETURN 100;
  END IF;

  hours_since_last := EXTRACT(EPOCH FROM (NOW() - lead_record.crm_last_interaction)) / 3600;

  IF lead_record.client_id IS NOT NULL THEN score := score + 15; END IF;
  IF lead_record.urgency_level = 'high' THEN score := score + 15; END IF;
  IF lead_record.equipment_type IN ('fogao', 'lava-loucas', 'maquina-lavar') THEN score := score + 10; END IF;
  IF hours_since_last > 24 AND hours_since_last <= 48 THEN score := score - 20;
  ELSIF hours_since_last > 48 THEN score := score - 30; END IF;

  IF lead_record.crm_status = 'aguardando_resposta' AND hours_since_last > 72 THEN score := score - 20; END IF;

  score := GREATEST(0, LEAST(100, score));
  UPDATE pre_schedules SET crm_score = score WHERE id = lead_id;
  RETURN score;
END;
$$ LANGUAGE plpgsql;
