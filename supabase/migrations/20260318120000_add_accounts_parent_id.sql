-- Add parent_id to accounts for hierarchy support
-- Caixa accounts can be children of bank accounts

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
