/*
  # Create activity_logs table

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `action` (text) - the action performed (create, update, delete, etc.)
      - `entity_type` (text) - the type of entity affected (transaction, category, etc.)
      - `entity_id` (uuid) - the ID of the affected entity
      - `changes` (jsonb) - JSON object containing the changes made
      - `description` (text) - human-readable description of the action
      - `created_at` (timestamp with timezone, default now())

  2. Security
    - Enable RLS on `activity_logs` table
    - Add policy for users to read activity logs in their workspaces
    - Add policy for authenticated users to create activity logs in their workspaces

  3. Indexes
    - Index on workspace_id for efficient workspace-scoped queries
    - Index on created_at for chronological ordering
    - Index on entity_type and action for filtering
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- RLS Policies
CREATE POLICY "Users can read activity logs in their workspaces"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity logs in their workspaces"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );