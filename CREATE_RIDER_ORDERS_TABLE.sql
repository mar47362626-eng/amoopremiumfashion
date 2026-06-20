-- Create rider_orders table for tracking orders assigned to riders
CREATE TABLE IF NOT EXISTS rider_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL,
  rider_id VARCHAR(255) NOT NULL,
  accepted_by_rider_id VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  order_total DECIMAL(15, 2),
  order_items JSONB,
  status VARCHAR(50) DEFAULT 'shipped',
  delivery_code VARCHAR(10),
  code_sent_at TIMESTAMP,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  picked_at TIMESTAMP,
  on_way_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_rider FOREIGN KEY (rider_id) REFERENCES riders(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rider_orders_order_id ON rider_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_rider_orders_rider_id ON rider_orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_orders_status ON rider_orders(status);
CREATE INDEX IF NOT EXISTS idx_rider_orders_assigned_at ON rider_orders(assigned_at DESC);

-- Disable RLS for now (backend needs to insert without auth restrictions)
-- Enable this only after setting up proper service role permissions
-- ALTER TABLE rider_orders ENABLE ROW LEVEL SECURITY;
