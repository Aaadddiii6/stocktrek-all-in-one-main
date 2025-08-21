-- Create enums for status and sizes
CREATE TYPE public.courier_status AS ENUM ('Dispatched', 'In Transit', 'Delivered', 'Delayed', 'Failed');
CREATE TYPE public.blazer_size AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');
CREATE TYPE public.kit_type AS ENUM ('Lab', 'Individual', 'Returnable');
CREATE TYPE public.app_role AS ENUM ('admin', 'inventory_manager', 'viewer');

-- Create user roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 1. Outstation Courier Tracking Module
CREATE TABLE public.courier_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sr_no SERIAL UNIQUE NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    courier_details TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    status courier_status NOT NULL DEFAULT 'Dispatched',
    delivery_date DATE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Kits Inventory Module
CREATE TABLE public.kits_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    item_name TEXT NOT NULL,
    opening_balance INTEGER NOT NULL DEFAULT 0,
    addins INTEGER NOT NULL DEFAULT 0,
    takeouts INTEGER NOT NULL DEFAULT 0,
    closing_balance INTEGER GENERATED ALWAYS AS (opening_balance + addins - takeouts) STORED,
    remarks TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Daily Expenses Module
CREATE TABLE public.daily_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sr_no SERIAL UNIQUE NOT NULL,
    date DATE NOT NULL,
    remarks TEXT NOT NULL,
    expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
    fixed_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (expenses + fixed_amount) STORED,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Blazer Inventory Module
CREATE TABLE public.blazer_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    size blazer_size NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    in_office_stock INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(size, user_id)
);

-- 5. Games Inventory Module
CREATE TABLE public.games_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sr_no SERIAL UNIQUE NOT NULL,
    game_details TEXT NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    adding INTEGER NOT NULL DEFAULT 0,
    previous_stock INTEGER NOT NULL DEFAULT 0,
    in_stock INTEGER GENERATED ALWAYS AS (previous_stock - sent + adding) STORED,
    sent_by TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Books Distribution Module
CREATE TABLE public.books_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordered_from_printer INTEGER NOT NULL DEFAULT 0,
    received INTEGER NOT NULL DEFAULT 0,
    total_used_till_now INTEGER NOT NULL DEFAULT 0,
    school_name TEXT NOT NULL,
    address TEXT NOT NULL,
    kit_type kit_type NOT NULL,
    additional TEXT,
    coordinator_name TEXT NOT NULL,
    coordinator_number TEXT NOT NULL,
    delivery_date DATE,
    grade1 INTEGER DEFAULT 0,
    grade2 INTEGER DEFAULT 0,
    grade3 INTEGER DEFAULT 0,
    grade4 INTEGER DEFAULT 0,
    grade5 INTEGER DEFAULT 0,
    grade6 INTEGER DEFAULT 0,
    grade7 INTEGER DEFAULT 0,
    grade7iot INTEGER DEFAULT 0,
    grade8 INTEGER DEFAULT 0,
    grade8iot INTEGER DEFAULT 0,
    grade9 INTEGER DEFAULT 0,
    grade9iot INTEGER DEFAULT 0,
    grade10 INTEGER DEFAULT 0,
    grade10iot INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blazer_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books_distribution ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create profiles trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  
  -- Assign default viewer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'viewer');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courier_tracking_updated_at BEFORE UPDATE ON public.courier_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kits_inventory_updated_at BEFORE UPDATE ON public.kits_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_expenses_updated_at BEFORE UPDATE ON public.daily_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blazer_inventory_updated_at BEFORE UPDATE ON public.blazer_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_games_inventory_updated_at BEFORE UPDATE ON public.games_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_books_distribution_updated_at BEFORE UPDATE ON public.books_distribution FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles (admins can manage all roles)
CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for courier_tracking
CREATE POLICY "Authenticated users can view courier tracking" ON public.courier_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert courier tracking" ON public.courier_tracking FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update courier tracking" ON public.courier_tracking FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete courier tracking" ON public.courier_tracking FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for kits_inventory
CREATE POLICY "Authenticated users can view kits inventory" ON public.kits_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert kits inventory" ON public.kits_inventory FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update kits inventory" ON public.kits_inventory FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete kits inventory" ON public.kits_inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_expenses
CREATE POLICY "Authenticated users can view daily expenses" ON public.daily_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert daily expenses" ON public.daily_expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update daily expenses" ON public.daily_expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete daily expenses" ON public.daily_expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blazer_inventory
CREATE POLICY "Authenticated users can view blazer inventory" ON public.blazer_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert blazer inventory" ON public.blazer_inventory FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update blazer inventory" ON public.blazer_inventory FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete blazer inventory" ON public.blazer_inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for games_inventory
CREATE POLICY "Authenticated users can view games inventory" ON public.games_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert games inventory" ON public.games_inventory FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update games inventory" ON public.games_inventory FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete games inventory" ON public.games_inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for books_distribution
CREATE POLICY "Authenticated users can view books distribution" ON public.books_distribution FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert books distribution" ON public.books_distribution FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update books distribution" ON public.books_distribution FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Admins can delete books distribution" ON public.books_distribution FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));