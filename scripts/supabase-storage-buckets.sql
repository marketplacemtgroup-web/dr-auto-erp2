-- Buckets para fotos da OS, veículos e documentos (Supabase Storage)
-- Execute no SQL Editor do Supabase ou: supabase db push (migration em supabase/migrations/)

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vehicle-photos', 'vehicle-photos', false),
  ('os-media', 'os-media', false),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
