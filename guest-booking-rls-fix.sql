-- ============================================================================
-- GUEST BOOKING RLS POLICY FIX
-- Allows anonymous users (guests) to create purchases
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- Step 1: Drop existing conflicting policies (if they exist)
DROP POLICY IF EXISTS "users_can_insert_purchases" ON purchases;
DROP POLICY IF EXISTS "users_can_select_purchases" ON purchases;
DROP POLICY IF EXISTS "users_can_update_purchases" ON purchases;
DROP POLICY IF EXISTS "purchases_insert_policy" ON purchases;
DROP POLICY IF EXISTS "purchases_select_policy" ON purchases;
DROP POLICY IF EXISTS "purchases_update_policy" ON purchases;

-- Step 2: Enable RLS on purchases table (if not already enabled)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies for AUTHENTICATED users
CREATE POLICY "authenticated_users_can_insert_purchases" ON purchases
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

CREATE POLICY "authenticated_users_can_select_purchases" ON purchases
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

CREATE POLICY "authenticated_users_can_update_purchases" ON purchases
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Step 4: Create policies for ANONYMOUS users (Guest Bookings)
CREATE POLICY "anonymous_users_can_insert_purchases" ON purchases
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL
);

CREATE POLICY "anonymous_users_can_select_purchases" ON purchases
FOR SELECT
USING (
  auth.uid() IS NULL
);

CREATE POLICY "anonymous_users_can_update_purchases" ON purchases
FOR UPDATE
USING (
  auth.uid() IS NULL
)
WITH CHECK (
  auth.uid() IS NULL
);

-- Step 5: Grant necessary permissions
GRANT ALL ON purchases TO authenticated;
GRANT ALL ON purchases TO anon;

-- Step 6: Verify policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'purchases';

-- ============================================================================
-- SUCCESS MESSAGE:
-- "Guest booking RLS policies have been applied successfully!"
-- "Anonymous users can now create purchases."
-- ============================================================================
