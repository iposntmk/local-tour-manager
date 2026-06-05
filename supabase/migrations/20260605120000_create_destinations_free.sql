CREATE TABLE IF NOT EXISTS destinations_free (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  province_id uuid REFERENCES provinces(id),
  province_name_at_booking text,
  status text NOT NULL DEFAULT 'active',
  search_keywords text[] DEFAULT '{}',
  is_shared boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE destinations_free ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on destinations_free"
  ON destinations_free
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT email FROM user_profiles WHERE id = auth.uid()) = 'iposntmk@gmail.com'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR (SELECT email FROM user_profiles WHERE id = auth.uid()) = 'iposntmk@gmail.com'
  );

CREATE POLICY "Editors can insert, select, update on destinations_free"
  ON destinations_free
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'editor'
    AND (
      is_shared = true
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'editor'
    AND (
      is_shared = true
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Viewers can select on destinations_free"
  ON destinations_free
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'viewer'
    AND (
      is_shared = true
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Editors can insert own destinations_free"
  ON destinations_free
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('editor', 'admin')
    OR (SELECT email FROM user_profiles WHERE id = auth.uid()) = 'iposntmk@gmail.com'
  );
