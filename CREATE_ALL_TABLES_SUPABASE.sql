-- Combined schema for AMOO STORE (Supabase)
-- Creates: users, admin_users, products, orders, order_items, payments,
-- riders, rider_order_table_2, delivery_orders, order_riders
-- Run this in Supabase SQL Editor for your project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow inserts to users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates to users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- ===== ADMIN USERS =====
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow backend read admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Allow backend insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update admin_users" ON public.admin_users FOR UPDATE USING (true) WITH CHECK (true);

-- ===== PRODUCTS =====
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100),
  image_url TEXT,
  tag VARCHAR(100),
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow backend insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow backend update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);

-- ===== ORDERS =====
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow backend updates to orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

-- ===== ORDER ITEMS =====
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  price DECIMAL(12,2) DEFAULT 0,
  product_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow backend updates to order_items" ON public.order_items FOR UPDATE USING (true) WITH CHECK (true);

-- ===== PAYMENTS =====
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow backend updates to payments" ON public.payments FOR UPDATE USING (true) WITH CHECK (true);

-- ===== RIDERS =====
CREATE TABLE IF NOT EXISTS public.riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  vehicle_type TEXT,
  license_plate TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  month_deliveries INTEGER DEFAULT 0,
  month_earnings DECIMAL(12,2) DEFAULT 0.00,
  total_earnings DECIMAL(12,2) DEFAULT 0.00,
  is_online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_riders_email ON public.riders(email);
CREATE INDEX IF NOT EXISTS idx_riders_online ON public.riders(is_online);
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read riders" ON public.riders FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to riders" ON public.riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow riders update own data" ON public.riders FOR UPDATE USING (auth.uid()::text = id);

-- ===== RIDER ORDER TABLE 2 (available orders for riders) =====
CREATE TABLE IF NOT EXISTS public.rider_order_table_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  order_total DECIMAL(12,2),
  order_items JSONB,
  rider_id TEXT REFERENCES public.riders(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'shipped',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_code VARCHAR(10),
  delivery_code_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_status ON public.rider_order_table_2(status);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_rider_id ON public.rider_order_table_2(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_order_table_2_order_id ON public.rider_order_table_2(order_id);
ALTER TABLE public.rider_order_table_2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to rider_order_table_2" ON public.rider_order_table_2 FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to rider_order_table_2" ON public.rider_order_table_2 FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates to rider_order_table_2" ON public.rider_order_table_2 FOR UPDATE USING (true) WITH CHECK (true);

-- ===== DELIVERY ORDERS (active deliveries) =====
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL UNIQUE,
  rider_id TEXT NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  rider_name VARCHAR(255),
  rider_email VARCHAR(255),
  rider_phone VARCHAR(20),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  order_total DECIMAL(12,2),
  order_items JSONB,
  status VARCHAR(50) DEFAULT 'accepted',
  delivery_code VARCHAR(10),
  code_sent_at TIMESTAMP WITH TIME ZONE,
  delivery_code_verified BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_notified BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_rider_id ON public.delivery_orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_id ON public.delivery_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to delivery_orders" ON public.delivery_orders FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to delivery_orders" ON public.delivery_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates to delivery_orders" ON public.delivery_orders FOR UPDATE USING (true) WITH CHECK (true);

-- ===== MESSAGES =====
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGINT PRIMARY KEY,
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  recipient_emails TEXT[],
  recipient_phones TEXT[],
  subject TEXT,
  message_content TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts to messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates to messages" ON public.messages FOR UPDATE USING (true) WITH CHECK (true);

-- ===== ORDER_RIDERS (assignments) =====
CREATE TABLE IF NOT EXISTS public.order_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id TEXT NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_code VARCHAR(10),
  status VARCHAR(50) DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_riders_rider_id ON public.order_riders(rider_id);
CREATE INDEX IF NOT EXISTS idx_order_riders_order_id ON public.order_riders(order_id);
CREATE INDEX IF NOT EXISTS idx_order_riders_status ON public.order_riders(status);
ALTER TABLE public.order_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read order_riders" ON public.order_riders FOR SELECT USING (true);
CREATE POLICY "Allow backend inserts order_riders" ON public.order_riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates order_riders" ON public.order_riders FOR UPDATE USING (true) WITH CHECK (true);

-- ===== TRIGGERS: update updated_at =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_updated_at_trigger') THEN
    -- attach triggers for common tables
    EXECUTE 'CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_rider_order_table_2_updated_at BEFORE UPDATE ON public.rider_order_table_2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
    EXECUTE 'CREATE TRIGGER update_order_riders_updated_at BEFORE UPDATE ON public.order_riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;
END$$;

-- ==========================
-- End of combined schema
-- ==========================
