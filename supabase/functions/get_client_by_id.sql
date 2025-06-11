
-- Create function to get client by ID
CREATE OR REPLACE FUNCTION public.get_client_by_id(client_id UUID)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.clients WHERE id = client_id;
END;
$$;
