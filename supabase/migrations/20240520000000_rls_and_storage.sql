-- Aplicar somente no Supabase (nuvem ou supabase start)
-- Tabelas de negócio são criadas pelo Prisma

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vehicle-photos', 'vehicle-photos', false),
  ('os-media', 'os-media', false),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Exemplo RLS (habilitar quando usar Supabase Auth)
-- ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "members_select_own_org" ON public.organization_members
--   FOR SELECT USING (
--     organization_id IN (
--       SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
--     )
--   );
