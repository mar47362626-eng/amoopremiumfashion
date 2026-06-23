-- ===== ORDERS TABLE (Main Order Storage) =====
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  subtotal DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on customer_email for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow all reads
CREATE POLICY "Allow public read access to orders" 
  ON public.orders
  FOR SELECT
  USING (true);

-- Allow all inserts
CREATE POLICY "Allow inserts to orders" 
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- Allow updates
CREATE POLICY "Allow updates to orders" 
  ON public.orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== ORDER_ITEMS TABLE =====
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  product_name VARCHAR(255),
  quantity INT,
  price DECIMAL(10, 2),
  product_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow all reads
CREATE POLICY "Allow public read access to order_items" 
  ON public.order_items
  FOR SELECT
  USING (true);

-- Allow all inserts
CREATE POLICY "Allow inserts to order_items" 
  ON public.order_items
  FOR INSERT
  WITH CHECK (true);

-- Allow updates
CREATE POLICY "Allow updates to order_items" 
  ON public.order_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== PAYMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow all reads
CREATE POLICY "Allow public read access to payments" 
  ON public.payments
  FOR SELECT
  USING (true);

-- Allow all inserts
CREATE POLICY "Allow inserts to payments" 
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Allow updates
CREATE POLICY "Allow updates to payments" 
  ON public.payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== USERS TABLE (for customer reference) =====
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow all reads
CREATE POLICY "Allow public read access to users" 
  ON public.users
  FOR SELECT
  USING (true);

-- Allow all inserts
CREATE POLICY "Allow inserts to users" 
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow updates
CREATE POLICY "Allow updates to users" 
  ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
