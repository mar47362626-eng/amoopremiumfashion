-- ========================================
-- FIX: Create missing order_riders table and fix RLS policies
-- Run this in Supabase SQL Editor to fix permissions
-- ========================================

-- Create order_riders table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_riders (
  id TEXT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  rider_id TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  delivery_code TEXT,
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT order_id_fk FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT rider_id_fk FOREIGN KEY (rider_id) REFERENCES riders(id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS order_riders_rider_idx ON order_riders(rider_id);
CREATE INDEX IF NOT EXISTS order_riders_order_idx ON order_riders(order_id);
CREATE INDEX IF NOT EXISTS order_riders_status_idx ON order_riders(status);

-- Enable RLS on order_riders if not already enabled
ALTER TABLE order_riders ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Allow riders read own data" ON riders;
DROP POLICY IF EXISTS "Allow riders read own assignments" ON order_riders;

-- Create new backend-friendly policies for INSERT operations
-- Allow backend service to insert riders without auth context
CREATE POLICY "Allow backend insert riders" 
  ON riders FOR INSERT 
  WITH CHECK (true);

-- Allow backend service to insert order_riders without auth context
CREATE POLICY "Allow backend insert order_riders" 
  ON order_riders FOR INSERT 
  WITH CHECK (true);

-- ========================================
-- Verify tables and policies are in place
-- ========================================
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('riders', 'order_riders');

