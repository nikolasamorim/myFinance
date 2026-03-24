import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Users,
  ShieldCheck,
  UsersRound,
  Plug,
  Crown,
  Settings,
  CalendarDays,
} from 'lucide-react';
import { BreadcrumbBar } from '../components/ui/BreadcrumbBar';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { workspaceService } from '../services/workspace.service';
import { getWorkspaceIcon } from '../lib/workspaceUtils';
import { formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CreateWorkspaceModal } from '../components/workspace/CreateWorkspaceModal';
import { SettingsModal } from '../components/workspace/SettingsModal';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { useTeams } from '../hooks/useTeams';
import { useBankingConnections } from '../hooks/useBankingConnections';
import type { Workspace, WorkspaceMember, PluggyConnectionStatus } from '../types';

// ─── Utilities ─────────────────────────────────────────────────────────────

const typeLabel = (type: Workspace['workspace_type']) => {
  switch (type) {
    case 'personal': return 'Pessoal';
    case 'family': return 'Familiar';
    case 'business': return 'Empresa';
  }
};

const typeBadgeClass = (type: Workspace['workspace_type']) => {
  switch (type) {
    case 'personal': return 'bg-bg-elevated text-text-secondary';
    case 'family': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'business': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

const connectionStatusLabel: Record<PluggyConnectionStatus, string> = {
  active: 'Conectado',
  updating: 'Atualizando',
  login_error: 'Erro de login',
  error: 'Erro',
  disconnected: 'Desconectado',
};

const connectionStatusDot: Record<PluggyConnectionStatus, string> = {
  active: 'bg-green-500',
  updating: 'bg-yellow-500',
  login_error: 'bg-red-500',
  error: 'bg-red-500',
  disconnected: 'bg-bg-elevated border border-border',
};

const roleOrder: Record<WorkspaceMember['role'], number> = { owner: 0, admin: 1, member: 2 };

// ─── Avatar ─────────────────────────────────────────────────────────────────

const avatarColors = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
];

function MemberAvatar({ name, index, size = 'md' }: { name: string; index: number; size?: 'sm' | 'md' }) {
  const colorClass = avatarColors[index % avatarColors.length];
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${colorClass}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Role Badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: WorkspaceMember['role'] }) {
  const classes: Record<WorkspaceMember['role'], string> = {
    owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    member: 'bg-bg-elevated text-text-secondary',
  };
  const labels: Record<WorkspaceMember['role'], string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${classes[role]}`}>
      {labels[role]}
    </span>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-bg-elevated rounded w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-bg-elevated rounded w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Edit / Delete Modals (kept from original) ───────────────────────────────

function EditWorkspaceModal({
  workspace, onClose, onSaved,
}: { workspace: Workspace; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(workspace.workspace_name);
  const [icon, setIcon] = useState(workspace.workspace_icon ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError('O nome não pode ser vazio.'); return; }
    setLoading(true); setError('');
    try {
      await workspaceService.updateWorkspace(workspace.workspace_id, {
        workspace_name: trimmedName,
        ...(icon.trim() ? { workspace_icon: icon.trim() } : { workspace_icon: undefined }),
      });
      await onSaved();
      onClose();
    } catch { setError('Erro ao salvar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Editar workspace" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nome</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-2 text-sm bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Nome do workspace" autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Ícone <span className="text-text-muted font-normal">(emoji ou URL — opcional)</span>
          </label>
          <input
            type="text" value={icon} onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="🏢"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading || !name.trim()} className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteWorkspaceModal({
  workspace, onClose, onDeleted,
}: { workspace: Workspace; onClose: () => void; onDeleted: () => Promise<void> }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isMatch = confirmName === workspace.workspace_name;

  const handleDelete = async () => {
    if (!isMatch || loading) return;
    setLoading(true); setError('');
    try {
      await workspaceService.deleteWorkspace(workspace.workspace_id);
      await onDeleted();
      onClose();
    } catch { setError('Erro ao excluir. Tente novamente.'); setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Excluir workspace" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">
            Esta ação é irreversível e removerá permanentemente o workspace{' '}
            <span className="font-semibold">"{workspace.workspace_name}"</span>{' '}
            e todos os dados associados.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Para confirmar, digite: <span className="font-semibold text-text-primary">{workspace.workspace_name}</span>
          </label>
          <input
            type="text" value={confirmName} onChange={(e) => setConfirmName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            className="w-full px-3 py-2 text-sm bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Digite o nome exato" autoFocus
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
          <button onClick={handleDelete} disabled={!isMatch || loading} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors">
            {loading ? 'Excluindo...' : 'Excluir workspace'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Workspace Selector Fallback ─────────────────────────────────────────────

function WorkspaceSelectorFallback() {
  const { user } = useAuth();
  const { workspaces, setCurrentWorkspace, currentWorkspace, refetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  const handleSelect = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary">
          Boas-vindas, {user?.name ?? user?.email}!
        </h1>
        <p className="text-text-secondary mt-1">Selecione um workspace para continuar.</p>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-bg-elevated rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-secondary mb-6">Você ainda não faz parte de nenhum workspace.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Crie um workspace
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {workspaces.map((ws) => {
              const isOwner = ws.workspace_owner_user_id === user?.id;
              const isActive = ws.workspace_id === currentWorkspace?.workspace_id;
              return (
                <div key={ws.workspace_id} className="group relative flex items-center gap-3 p-4 bg-bg-page border border-border rounded-xl hover:border-accent hover:shadow-sm transition-all">
                  <button onClick={() => handleSelect(ws)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${isActive ? 'bg-accent/10' : 'bg-bg-elevated'}`}>
                      {getWorkspaceIcon(ws)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{ws.workspace_name}</p>
                      <p className="text-xs text-text-muted">
                        {typeLabel(ws.workspace_type)}
                        {isOwner ? ' · Proprietário' : ' · Membro'}
                        {isActive && <span className="ml-1 text-accent">· Ativo</span>}
                      </p>
                    </div>
                  </button>
                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setEditTarget(ws); }} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws); }} className="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Plus className="w-4 h-4" />
            Novo workspace
          </button>
        </>
      )}

      <CreateWorkspaceModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      {editTarget && (
        <EditWorkspaceModal workspace={editTarget} onClose={() => setEditTarget(null)} onSaved={refetchWorkspaces} />
      )}
      {deleteTarget && (
        <DeleteWorkspaceModal workspace={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={async () => { await refetchWorkspaces(); }} />
      )}
    </div>
  );
}

// ─── Workspace Hero Header ───────────────────────────────────────────────────

function WorkspaceHeroActions({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  if (!currentWorkspace || currentWorkspace.workspace_owner_user_id !== user?.id) return null;
  return (
    <button
      onClick={onOpenSettings}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors flex-shrink-0"
    >
      <Settings className="w-4 h-4" />
      Editar
    </button>
  );
}

function WorkspaceHeroHeader() {
  const { currentWorkspace } = useWorkspace();
  if (!currentWorkspace) return null;

  return (
    <div className="flex items-center gap-4 px-1 sm:px-0">
      <div className="w-12 h-12 rounded-2xl bg-bg-elevated flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden border border-border">
        {getWorkspaceIcon(currentWorkspace)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-text-primary truncate">{currentWorkspace.workspace_name}</h1>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadgeClass(currentWorkspace.workspace_type)}`}>
            {typeLabel(currentWorkspace.workspace_type)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-text-muted">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Criado em {formatDate(currentWorkspace.workspace_created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Row ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, colorClass, loading }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="animate-pulse bg-bg-page border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-bg-elevated flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-bg-elevated rounded w-1/3" />
          <div className="h-3 bg-bg-elevated rounded w-2/3" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-bg-page border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

function OverviewKpiRow() {
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers();
  const { data: teams, isLoading: loadingTeams } = useTeams();
  const { data: connections, isLoading: loadingConnections } = useBankingConnections();

  const loading = loadingMembers || loadingTeams || loadingConnections;
  const adminCount = (members ?? []).filter((m) => m.role === 'owner' || m.role === 'admin').length;
  const activeConnections = (connections ?? []).filter((c) => c.status === 'active').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={<Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        label="Membros"
        value={members?.length ?? 0}
        colorClass="bg-indigo-50 dark:bg-indigo-900/30"
        loading={loading}
      />
      <KpiCard
        icon={<ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        label="Administradores"
        value={adminCount}
        colorClass="bg-blue-50 dark:bg-blue-900/30"
        loading={loading}
      />
      <KpiCard
        icon={<UsersRound className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
        label="Equipes"
        value={teams?.length ?? 0}
        colorClass="bg-violet-50 dark:bg-violet-900/30"
        loading={loading}
      />
      <KpiCard
        icon={<Plug className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        label="Integrações ativas"
        value={activeConnections}
        colorClass="bg-emerald-50 dark:bg-emerald-900/30"
        loading={loading}
      />
    </div>
  );
}

// ─── Administrators Section ──────────────────────────────────────────────────

function AdministratorsSection() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: members, isLoading } = useWorkspaceMembers();

  // Admins from members list (includes owner with role='owner' if API returns them)
  const adminsFromList = (members ?? [])
    .filter((m) => m.role === 'owner' || m.role === 'admin')
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  // Ensure the owner always appears — fallback to workspace context + current user
  const ownerInList = adminsFromList.some((m) => m.role === 'owner');
  const isCurrentUserOwner = currentWorkspace?.workspace_owner_user_id === user?.id;

  type AdminEntry = { id: string; name: string; email: string; role: WorkspaceMember['role'] };

  const admins: AdminEntry[] = ownerInList
    ? adminsFromList.map((m) => ({ id: m.user_id, name: m.name, email: m.email, role: m.role }))
    : [
        // Inject owner from context when API doesn't include them with role='owner'
        ...(isCurrentUserOwner && user
          ? [{ id: user.id, name: user.name, email: user.email, role: 'owner' as const }]
          : []),
        ...adminsFromList.map((m) => ({ id: m.user_id, name: m.name, email: m.email, role: m.role })),
      ];

  return (
    <Card>
      <CardHeader className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-text-muted" />
          <span className="font-semibold text-text-primary text-sm">Administradores</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-bg-elevated" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-bg-elevated rounded w-1/3" />
                  <div className="h-2.5 bg-bg-elevated rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-text-muted py-2">Nenhum administrador encontrado.</p>
        ) : (
          <div className="space-y-3">
            {admins.map((admin, idx) => (
              <div key={admin.id} className="flex items-center gap-3">
                <MemberAvatar name={admin.name} index={idx} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{admin.name}</p>
                  <p className="text-xs text-text-muted truncate">{admin.email}</p>
                </div>
                <RoleBadge role={admin.role} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Members Section Preview ─────────────────────────────────────────────────

const MEMBERS_PREVIEW_LIMIT = 6;

function MembersSectionPreview({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: members, isLoading } = useWorkspaceMembers();

  const sorted = [...(members ?? [])].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  const preview = sorted.slice(0, MEMBERS_PREVIEW_LIMIT);
  const total = sorted.length;

  return (
    <Card>
      <CardHeader className="px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-muted" />
            <span className="font-semibold text-text-primary text-sm">
              Membros{total > 0 && ` (${total})`}
            </span>
          </div>
          {total > MEMBERS_PREVIEW_LIMIT && (
            <button
              onClick={onOpenSettings}
              className="text-xs text-accent hover:underline font-medium"
            >
              Ver todos
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-bg-elevated" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-bg-elevated rounded w-1/3" />
                  <div className="h-2.5 bg-bg-elevated rounded w-1/2" />
                </div>
                <div className="h-5 w-14 bg-bg-elevated rounded-full" />
              </div>
            ))}
          </div>
        ) : preview.length === 0 ? (
          <p className="text-sm text-text-muted py-2">Nenhum membro encontrado.</p>
        ) : (
          <div className="space-y-3">
            {preview.map((member, idx) => (
              <div key={member.user_id} className="flex items-center gap-3">
                <MemberAvatar name={member.name} index={idx} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{member.name}</p>
                  <p className="text-xs text-text-muted truncate">{member.email}</p>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}
            {total > MEMBERS_PREVIEW_LIMIT && (
              <button onClick={onOpenSettings} className="w-full text-xs text-center text-accent hover:underline pt-1 font-medium">
                Ver todos os {total} membros
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Teams Section ───────────────────────────────────────────────────────────

function TeamsSectionCards({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: teams, isLoading } = useTeams();
  const { data: members } = useWorkspaceMembers();
  const { user } = useAuth();

  const currentUserMember = (members ?? []).find((m) => m.user_id === user?.id);
  const canManage = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  return (
    <Card>
      <CardHeader className="px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersRound className="w-4 h-4 text-text-muted" />
            <span className="font-semibold text-text-primary text-sm">Equipes</span>
          </div>
          {canManage && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-xs text-accent hover:underline font-medium"
            >
              <Plus className="w-3 h-3" />
              Criar equipe
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-3">
        {isLoading ? (
          <SkeletonCard lines={2} />
        ) : !teams || teams.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <UsersRound className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">Nenhuma equipe criada ainda.</p>
            {canManage && (
              <button onClick={onOpenSettings} className="mt-2 text-xs text-accent hover:underline font-medium">
                Criar primeira equipe
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((team) => (
              <div key={team.team_id} className="flex items-center gap-2.5 p-2.5 bg-bg-elevated rounded-lg">
                <div className="w-7 h-7 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <UsersRound className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{team.name}</p>
                  <p className="text-xs text-text-muted">Criado em {formatDate(team.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Integrations Section ────────────────────────────────────────────────────

function IntegrationsSection() {
  const { data: connections, isLoading } = useBankingConnections();

  return (
    <Card>
      <CardHeader className="px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-text-muted" />
            <span className="font-semibold text-text-primary text-sm">Integrações</span>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium bg-bg-elevated text-text-muted rounded-full">Em breve</span>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-3">
        {isLoading ? (
          <SkeletonCard lines={2} />
        ) : !connections || connections.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <Plug className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">Nenhuma integração ativa.</p>
            <p className="text-xs text-text-muted mt-1">Conecte seu banco para importar transações automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connectionStatusDot[conn.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{conn.institution_name}</p>
                  {conn.last_sync_at && (
                    <p className="text-xs text-text-muted">Última sync: {formatDate(conn.last_sync_at)}</p>
                  )}
                </div>
                <span className={`text-xs font-medium ${conn.status === 'active' ? 'text-green-600 dark:text-green-400' : conn.status === 'updating' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'}`}>
                  {connectionStatusLabel[conn.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export function Overview() {
  const { currentWorkspace } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'workspace' | 'membros' | 'equipes'>('workspace');

  const openSettings = (section: 'workspace' | 'membros' | 'equipes' = 'workspace') => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  if (!currentWorkspace) {
    return <WorkspaceSelectorFallback />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between px-1 sm:px-0">
        <BreadcrumbBar segments={['Visão Geral']} />
        <WorkspaceHeroActions onOpenSettings={() => openSettings('workspace')} />
      </div>

      <WorkspaceHeroHeader />

      <OverviewKpiRow />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <AdministratorsSection />
          <MembersSectionPreview onOpenSettings={() => openSettings('membros')} />
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          <TeamsSectionCards onOpenSettings={() => openSettings('equipes')} />
          <IntegrationsSection />
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSection={settingsSection}
      />
    </div>
  );
}
