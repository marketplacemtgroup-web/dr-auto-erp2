-- Dashboard cache (sincronizado com supabase/migrations/20260625120000_dashboard_cache.sql)
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  expenses DECIMAL(14, 2) NOT NULL DEFAULT 0,
  profit DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ticket_average DECIMAL(14, 2) NOT NULL DEFAULT 0,
  service_orders INTEGER NOT NULL DEFAULT 0,
  closed_orders INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, date)
);

CREATE INDEX IF NOT EXISTS dashboard_cache_org_date_idx ON dashboard_cache (organization_id, date);
