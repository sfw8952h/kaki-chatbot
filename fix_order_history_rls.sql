/* 
  Fix Customer Order History Visibility
  
  When we enabled RLS for Suppliers, it might have blocked 
  regular customers from seeing their own orders.
  
  Run this in Supabase SQL Editor.
*/

-- 1. Ensure RLS is on for both tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Customers can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" 
ON public.orders
FOR SELECT 
USING (auth.uid() = profile_id);

-- 3. Policy: Customers can view their own order line items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" 
ON public.order_items
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.profile_id = auth.uid()
  )
);

-- Note: We already have the Supplier policies from previous steps. 
-- These new policies coexist with them.
