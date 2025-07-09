-- Enable RLS on users table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all users (public profiles)
CREATE POLICY "Users can view all users" ON "User"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id);

-- Policy: Service role can perform all operations
CREATE POLICY "Service role has full access" ON "User"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);