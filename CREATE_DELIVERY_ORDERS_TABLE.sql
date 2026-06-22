-- ===== DELIVERY ORDERS TABLE =====
-- This table stores orders that riders have accepted and are actively delivering
-- Moved here from rider_order_table_2 when rider accepts
-- Moved to orders table (status='delivered') when rider delivers

CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  
  -- Rider Information
  rider_id TEXT NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  rider_name VARCHAR(255),
  rider_email VARCHAR(255),
  rider_phone VARCHAR(20),
  
  -- Customer Information
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  
  -- Delivery Information
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  
  -- Order Information
  order_total DECIMAL(10, 2),
  order_items JSONB,
  
  -- Status: 'accepted' (rider accepted, in transit), 'code-sent' (code sent to customer), 'delivered'
  status VARCHAR(50) DEFAULT 'accepted',
  
  -- Delivery Verification
  delivery_code VARCHAR(10),
  code_sent_at TIMESTAMP WITH TIME ZONE,
  delivery_code_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Tracking
  admin_notified BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_orders_rider_id ON public.delivery_orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_id ON public.delivery_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_accepted_at ON public.delivery_orders(accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivered_at ON public.delivery_orders(delivered_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all reads
CREATE POLICY "Allow public read access to delivery_orders" 
  ON public.delivery_orders
  FOR SELECT
  USING (true);

-- Create policy to allow updates
CREATE POLICY "Allow updates to delivery_orders" 
  ON public.delivery_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create policy to allow inserts
CREATE POLICY "Allow inserts to delivery_orders" 
  ON public.delivery_orders
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow deletes
CREATE POLICY "Allow deletes from delivery_orders" 
  ON public.delivery_orders
  FOR DELETE
  USING (true);
