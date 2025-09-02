-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create coordinators table
CREATE TABLE public.coordinators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinator_name TEXT NOT NULL,
    coordinator_number TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools
CREATE POLICY "Authenticated users can view schools" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert schools" ON public.schools FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update schools" ON public.schools FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can delete schools" ON public.schools FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));

-- RLS Policies for coordinators
CREATE POLICY "Authenticated users can view coordinators" ON public.coordinators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory managers and admins can insert coordinators" ON public.coordinators FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can update coordinators" ON public.coordinators FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));
CREATE POLICY "Inventory managers and admins can delete coordinators" ON public.coordinators FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventory_manager'));

-- Create triggers for updated_at
CREATE TRIGGER update_schools_updated_at 
    BEFORE UPDATE ON public.schools 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coordinators_updated_at 
    BEFORE UPDATE ON public.coordinators 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update books_distribution table to reference schools and coordinators
ALTER TABLE public.books_distribution 
ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
ADD COLUMN coordinator_id UUID REFERENCES public.coordinators(id) ON DELETE CASCADE,
ADD COLUMN kit_name TEXT;

-- Note: Foreign key constraint for kit_name will be added in the next migration
-- after we create the unique constraint on book_inventory.kit_name
