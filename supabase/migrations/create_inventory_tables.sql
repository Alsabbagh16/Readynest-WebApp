-- Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  mobile VARCHAR(50),
  salesman VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES inventory_categories(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  size VARCHAR(20),
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_level INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_quantity ON inventory_items(quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);

-- Enable Row Level Security
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read inventory_categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventory_categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow authenticated users to update inventory_categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete inventory_categories" ON inventory_categories;
DROP POLICY IF EXISTS "Allow authenticated users to read inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to update inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete inventory_items" ON inventory_items;

-- Create policies for inventory_categories (admin/superadmin only)
CREATE POLICY "Allow admin to read inventory_categories"
  ON inventory_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to insert inventory_categories"
  ON inventory_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to update inventory_categories"
  ON inventory_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to delete inventory_categories"
  ON inventory_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

-- Create policies for inventory_suppliers (admin/superadmin only)
CREATE POLICY "Allow admin to read inventory_suppliers"
  ON inventory_suppliers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to insert inventory_suppliers"
  ON inventory_suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to update inventory_suppliers"
  ON inventory_suppliers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to delete inventory_suppliers"
  ON inventory_suppliers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

-- Create policies for inventory_items (admin/superadmin only)
CREATE POLICY "Allow admin to read inventory_items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to insert inventory_items"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to update inventory_items"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

CREATE POLICY "Allow admin to delete inventory_items"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND (e.role = 'admin' OR e.role = 'superadmin')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_suppliers_updated_at ON inventory_suppliers;
CREATE TRIGGER update_inventory_suppliers_updated_at
  BEFORE UPDATE ON inventory_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
