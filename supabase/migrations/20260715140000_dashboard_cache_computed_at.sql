-- Alinha dashboard_cache com o Prisma (computed_at).
-- Em alguns ambientes a tabela foi criada com updated_at (migration 20260626).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_cache'
      AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_cache'
      AND column_name = 'computed_at'
  ) THEN
    ALTER TABLE "dashboard_cache" RENAME COLUMN "updated_at" TO "computed_at";
  END IF;
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_cache'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dashboard_cache'
      AND column_name = 'computed_at'
  ) THEN
    ALTER TABLE "dashboard_cache"
      ADD COLUMN "computed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;
