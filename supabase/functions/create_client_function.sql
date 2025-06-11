
-- This function will be executed on the Supabase server
CREATE OR REPLACE FUNCTION public.create_client(
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_city TEXT,
  client_state TEXT,
  client_zip_code TEXT
) 
RETURNS SETOF clients
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.clients(name, email, phone, address, city, state, zip_code)
  VALUES (
    client_name,
    client_email,
    client_phone,
    client_address,
    client_city,
    client_state,
    client_zip_code
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_client TO authenticated;
