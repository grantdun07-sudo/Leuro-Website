CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON app_settings
  FOR ALL USING (auth.jwt() ->> 'email' = 'hello@leuroai.co.za');

CREATE POLICY "Public read" ON app_settings
  FOR SELECT USING (true);

INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('announcement', '')
ON CONFLICT (key) DO NOTHING;
