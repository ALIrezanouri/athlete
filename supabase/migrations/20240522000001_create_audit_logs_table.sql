-- Create audit_logs table
-- This table tracks all admin actions for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'user_created',
      'user_updated',
      'user_deleted',
      'user_role_changed',
      'gym_created',
      'gym_updated',
      'gym_deleted',
      'booking_created',
      'booking_updated',
      'booking_cancelled',
      'wallet_transaction',
      'config_updated'
    )
  ),
  target_type TEXT NOT NULL,
  target_id UUID,
  action_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on admin_user_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);

-- Create index on action_type for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Create index on created_at for date range filtering and sorting
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_created ON audit_logs(admin_user_id, created_at DESC);

-- Create composite index for action_type and created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action_type, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy: Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Audit log table tracking all admin actions for security and compliance';

-- Add comments to columns
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.admin_user_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (e.g., user_created, gym_updated)';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of entity affected (e.g., user, gym, booking)';
COMMENT ON COLUMN audit_logs.target_id IS 'ID of the entity affected by the action';
COMMENT ON COLUMN audit_logs.action_details IS 'JSON object containing detailed information about the action';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the action was performed';