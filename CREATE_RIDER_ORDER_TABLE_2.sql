-- ===== RIDER ORDER TABLE 2 (NEW DELIVERY SYSTEM) =====
-- This table stores orders available for riders to pick up
-- One entry per order (unassigned initially)
-- Riders can accept and deliver these orders

CREATE TABLE IF NOT EXISTS public.rider_order_table_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  
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
  
  -- Rider Assignment
  rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  
  -- Status: 'shipped' (available), 'accepted' (rider accepted), 'delivered'
  status VARCHAR(50) DEFAULT 'shipped',
  
  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Delivery Verification
  delivery_code VARCHAR(10),
  delivery_code_verified BOOLEAN DEFAULT FALSE,
  
  -- Indexes for fast lookups
  CONSTRAINT fk_order_id UNIQUE(order_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_status ON public.rider_order_table_2(status);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_rider_id ON public.rider_order_table_2(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_order_id ON public.rider_order_table_2(order_id);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_assigned_at ON public.rider_order_table_2(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_created_at ON public.rider_order_table_2(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.rider_order_table_2 ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all reads
CREATE POLICY "Allow public read access to rider_order_table_2" 
  ON public.rider_order_table_2
  FOR SELECT
  USING (true);

-- Create policy to allow updates
CREATE POLICY "Allow updates to rider_order_table_2" 
  ON public.rider_order_table_2
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create policy to allow inserts
CREATE POLICY "Allow inserts to rider_order_table_2" 
  ON public.rider_order_table_2
  FOR INSERT
  WITH CHECK (true);
