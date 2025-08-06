/*
  # Criar tabela de visualizações personalizadas

  1. Nova Tabela
    - `visualizations`
      - `visualization_id` (uuid, primary key)
      - `visualization_workspace_id` (uuid, foreign key para workspaces)
      - `visualization_user_id` (uuid, foreign key para auth.users)
      - `visualization_name` (text, nome da visualização)
      - `visualization_type` (text, tipo: 'cards', 'graph', 'table')
      - `visualization_screen_context` (text, contexto da tela)
      - `visualization_config` (jsonb, configurações personalizadas)
      - `visualization_is_default` (boolean, se é visualização padrão)
      - `visualization_created_at` (timestamp)
      - `visualization_updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `visualizations`
    - Política para usuários acessarem apenas suas visualizações nos workspaces que participam
    - Política para gerenciar visualizações nos workspaces que participam

  3. Restrições
    - Constraint para garantir apenas uma visualização padrão por (user_id, workspace_id, screen_context)
    - Check constraint para validar tipos de visualização
    - Índices para otimizar consultas

  4. Triggers
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar tabela de visualizações
CREATE TABLE IF NOT EXISTS visualizations (
  visualization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visualization_workspace_id uuid NOT NULL,
  visualization_user_id uuid NOT NULL,
  visualization_name text NOT NULL,
  visualization_type text NOT NULL,
  visualization_screen_context text NOT NULL,
  visualization_config jsonb DEFAULT '{}'::jsonb,
  visualization_is_default boolean DEFAULT false,
  visualization_created_at timestamptz DEFAULT now(),
  visualization_updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
ALTER TABLE visualizations 
ADD CONSTRAINT visualizations_workspace_fkey 
FOREIGN KEY (visualization_workspace_id) 
REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

ALTER TABLE visualizations 
ADD CONSTRAINT visualizations_user_fkey 
FOREIGN KEY (visualization_user_id) 
REFERENCES auth.users(id) ON DELETE CASCADE;

-- Adicionar check constraint para tipos válidos
ALTER TABLE visualizations 
ADD CONSTRAINT visualizations_type_check 
CHECK (visualization_type IN ('cards', 'graph', 'table'));

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_visualizations_workspace 
ON visualizations (visualization_workspace_id);

CREATE INDEX IF NOT EXISTS idx_visualizations_user 
ON visualizations (visualization_user_id);

CREATE INDEX IF NOT EXISTS idx_visualizations_context 
ON visualizations (visualization_screen_context);

CREATE INDEX IF NOT EXISTS idx_visualizations_default 
ON visualizations (visualization_user_id, visualization_workspace_id, visualization_screen_context, visualization_is_default);

-- Constraint única para garantir apenas uma visualização padrão por contexto
CREATE UNIQUE INDEX IF NOT EXISTS idx_visualizations_unique_default 
ON visualizations (visualization_user_id, visualization_workspace_id, visualization_screen_context) 
WHERE visualization_is_default = true;

-- Habilitar RLS
ALTER TABLE visualizations ENABLE ROW LEVEL SECURITY;

-- Política para usuários acessarem visualizações nos workspaces que participam
CREATE POLICY "Users can access visualizations in their workspaces"
  ON visualizations
  FOR ALL
  TO authenticated
  USING (
    visualization_workspace_id IN (
      SELECT workspace_user_workspace_id
      FROM workspace_users
      WHERE workspace_user_user_id = auth.uid()
    )
  );

-- Política para usuários gerenciarem suas próprias visualizações
CREATE POLICY "Users can manage their own visualizations"
  ON visualizations
  FOR ALL
  TO authenticated
  USING (visualization_user_id = auth.uid())
  WITH CHECK (visualization_user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_visualizations_updated_at
  BEFORE UPDATE ON visualizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();