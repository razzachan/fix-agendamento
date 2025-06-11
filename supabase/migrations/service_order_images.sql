
-- Create a storage bucket for service order images
insert into storage.buckets (id, name, public) values ('service_order_images', 'service_order_images', true);

-- Create a policy to allow public read access to the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'service_order_images' );

-- Create a policy to allow authenticated users to upload images
create policy "Authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'service_order_images' );

-- Create a policy to allow authenticated users to update their uploaded images
create policy "Authenticated users can update their images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'service_order_images' );

-- Create a policy to allow authenticated users to delete their uploaded images
create policy "Authenticated users can delete their images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'service_order_images' );
