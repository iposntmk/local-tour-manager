-- Create tour_shoppings table
CREATE TABLE IF NOT EXISTS tour_shoppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_shoppings_tour_id ON tour_shoppings(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_shoppings_date ON tour_shoppings(date);

ALTER TABLE tour_shoppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON tour_shoppings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tour_shoppings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tour_shoppings FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tour_shoppings FOR DELETE USING (true);

CREATE TRIGGER update_tour_shoppings_updated_at
  BEFORE UPDATE ON tour_shoppings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();