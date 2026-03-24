import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Building2,
  Users,
  UsersRound,
  ShieldCheck,
  Bell,
  Plug,
  Trash2,
  Plus,
  Loader2,
  Camera,
  Menu,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { useTeams, useCreateTeam, useDeleteTeam } from '../../hooks/useTeams';
import { useDeleteWorkspace } from '../../hooks/useDeleteWorkspace';
import { workspaceService } from '../../services/workspace.service';
import { WorkspaceAvatar, isWorkspacePhotoUrl } from '../../lib/workspaceUtils';
import { IconPicker } from '../ui/IconPicker';
import { ColorPicker } from '../ui/ColorPicker';
import { Settings } from '../../pages/Settings';
import { NotificationSettings } from '../../pages/NotificationSettings';
import { ImportacaoSection } from './ImportacaoSection';

type Section =
  | 'conta'
  | 'workspace'
  | 'importacao'
  | 'membros'
  | 'equipes'
  | 'administradores'
  | 'notificacoes'
  | 'integracoes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: Section;
}

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; group?: string }[] = [
  { id: 'conta', label: 'Conta', icon: <User className="w-4 h-4" />, group: 'Pessoal' },
  { id: 'notificacoes', label: 'Notificações', icon: <Bell className="w-4 h-4" />, group: 'Pessoal' },
  { id: 'workspace', label: 'Workspace', icon: <Building2 className="w-4 h-4" />, group: 'Workspace' },
  { id: 'importacao', label: 'Importação', icon: <Upload className="w-4 h-4" />, group: 'Workspace' },
  { id: 'membros', label: 'Membros', icon: <Users className="w-4 h-4" />, group: 'Workspace' },
  { id: 'equipes', label: 'Equipes', icon: <UsersRound className="w-4 h-4" />, group: 'Workspace' },
  { id: 'administradores', label: 'Administradores', icon: <ShieldCheck className="w-4 h-4" />, group: 'Workspace' },
  { id: 'integracoes', label: 'Integrações', icon: <Plug className="w-4 h-4" />, group: 'Workspace' },
];

function WorkspaceSection({ onClose }: { onClose: () => void }) {
  const { currentWorkspace, workspaces, refetchWorkspaces, userRole } = useWorkspace();
  const [name, setName] = useState(currentWorkspace?.workspace_name ?? '');
  const [workspaceType, setWorkspaceType] = useState<'personal' | 'family' | 'business'>(
    currentWorkspace?.workspace_type ?? 'personal'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconName, setIconName] = useState(
    !isWorkspacePhotoUrl(currentWorkspace?.workspace_icon) ? (currentWorkspace?.workspace_icon ?? '') : ''
  );
  const [workspaceColor, setWorkspaceColor] = useState(currentWorkspace?.workspace_color ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const iconInputRef = useRef<HTMLInputElement>(null);
  const deleteWorkspaceMutation = useDeleteWorkspace();

  const isOwner = userRole === 'owner';
  const isLastWorkspace = workspaces.length <= 1;
  const hasActivePhoto = !!iconPreview || isWorkspacePhotoUrl(currentWorkspace?.workspace_icon);

  // Reflects unsaved changes so the avatar updates live as the user picks icon/color/photo
  const previewWorkspace = currentWorkspace
    ? {
        ...currentWorkspace,
        workspace_icon: iconPreview ?? (hasActivePhoto ? currentWorkspace.workspace_icon : (iconName || undefined)),
        workspace_color: workspaceColor || undefined,
      }
    : null;

  useEffect(() => {
    setName(currentWorkspace?.workspace_name ?? '');
    setWorkspaceType(currentWorkspace?.workspace_type ?? 'personal');
    setWorkspaceColor(currentWorkspace?.workspace_color ?? '');
    setIconPreview(null);
    setIconName(!isWorkspacePhotoUrl(currentWorkspace?.workspace_icon) ? (currentWorkspace?.workspace_icon ?? '') : '');
    setShowDeleteConfirm(false);
    setDeleteConfirmName('');
  }, [currentWorkspace?.workspace_id]);

  const handleSave = async () => {
    if (!currentWorkspace || !name.trim()) return;
    try {
      setSaving(true);
      await workspaceService.updateWorkspace(currentWorkspace.workspace_id, {
        workspace_name: name.trim(),
        workspace_type: workspaceType,
        workspace_color: workspaceColor || '',
        ...(!hasActivePhoto && { workspace_icon: iconName || '' }),
      });
      await refetchWorkspaces();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;

    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setUploadingIcon(true);
      const publicUrl = await workspaceService.uploadWorkspaceIcon(currentWorkspace.workspace_id, file);
      await workspaceService.updateWorkspace(currentWorkspace.workspace_id, { workspace_icon: publicUrl });
      await refetchWorkspaces();
    } catch (e) {
      console.error(e);
      setIconPreview(null);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentWorkspace) return;
    try {
      setUploadingIcon(true);
      await workspaceService.updateWorkspace(currentWorkspace.workspace_id, {
        workspace_icon: iconName || '',
      });
      setIconPreview(null);
      await refetchWorkspaces();
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace || deleteConfirmName !== currentWorkspace.workspace_name) return;
    try {
      await deleteWorkspaceMutation.mutateAsync(currentWorkspace.workspace_id);
      setShowDeleteConfirm(false);
      setDeleteConfirmName('');
      onClose();
    } catch {
      // error surfaced via deleteWorkspaceMutation.error
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Workspace</h2>
        <p className="text-sm text-text-muted mt-1">Gerencie as configurações do seu workspace.</p>
      </div>

      <div className="space-y-4">
        {/* Preview */}
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <WorkspaceAvatar workspace={previewWorkspace} size="lg" />
            {uploadingIcon && (
              <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {/* Photo row */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Foto</p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated disabled:opacity-50 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {hasActivePhoto ? 'Trocar foto' : 'Enviar foto'}
                </button>
                {hasActivePhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingIcon}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover foto
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">PNG, JPG ou GIF. Máx. 2MB.</p>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Icon row */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                Ícone{hasActivePhoto && <span className="text-text-muted font-normal"> — exibido ao remover a foto</span>}
              </p>
              <IconPicker
                value={iconName}
                onChange={setIconName}
              />
              {iconName && (
                <button
                  type="button"
                  onClick={() => setIconName('')}
                  className="mt-1.5 text-xs text-text-muted hover:text-red-500 transition-colors"
                >
                  Remover ícone
                </button>
              )}
            </div>

            {/* Color row */}
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                Cor{hasActivePhoto && <span className="text-text-muted font-normal"> — exibida ao remover a foto</span>}
              </p>
              <ColorPicker
                value={workspaceColor}
                onChange={setWorkspaceColor}
              />
              {workspaceColor && (
                <button
                  type="button"
                  onClick={() => setWorkspaceColor('')}
                  className="mt-1.5 text-xs text-text-muted hover:text-red-500 transition-colors"
                >
                  Remover cor
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nome do workspace</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-bg-page text-text-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder-text-muted"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
          <select
            value={workspaceType}
            onChange={(e) => setWorkspaceType(e.target.value as 'personal' | 'family' | 'business')}
            className="w-full bg-bg-page text-text-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="personal">Pessoal</option>
            <option value="family">Familiar</option>
            <option value="business">Empresa</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>

      {isOwner && (
        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Zona de perigo</h3>
          <p className="text-xs text-text-muted mb-4">
            Ações irreversíveis que afetam permanentemente os dados do workspace.
          </p>

          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900/40 rounded-lg bg-red-50 dark:bg-red-950/10">
              <div>
                <p className="text-sm font-medium text-text-primary">Excluir workspace</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Remove permanentemente todas as transações, contas e dados associados.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLastWorkspace}
                title={isLastWorkspace ? 'Crie outro workspace antes de excluir este' : undefined}
                className="ml-4 flex-shrink-0 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Excluir
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-950/10">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  Todas as transações, contas, categorias, cartões e integrações serão excluídos permanentemente.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Digite{' '}
                  <span className="font-semibold text-text-primary">{currentWorkspace?.workspace_name}</span>
                  {' '}para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  autoFocus
                  placeholder={currentWorkspace?.workspace_name}
                  className="w-full px-3 py-2 text-sm bg-bg-page border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              {deleteWorkspaceMutation.error && (
                <p className="text-xs text-red-500">
                  {(deleteWorkspaceMutation.error as Error).message ?? 'Erro ao excluir. Tente novamente.'}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}
                  disabled={deleteWorkspaceMutation.isPending}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== currentWorkspace?.workspace_name || deleteWorkspaceMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteWorkspaceMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {deleteWorkspaceMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
                </button>
              </div>
            </div>
          )}

          {isLastWorkspace && (
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              Crie outro workspace antes de excluir este.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MembrosSection() {
  const { data: members, isLoading } = useWorkspaceMembers();

  const roleLabel: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Membros</h2>
          <p className="text-sm text-text-muted mt-1">Pessoas com acesso a este workspace.</p>
        </div>
        <button
          disabled
          title="Em breve"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted bg-bg-elevated rounded-lg cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Convidar membro</span>
          <span className="sm:hidden">Convidar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 p-3 bg-bg-surface rounded-lg">
              <div className="w-8 h-8 bg-bg-elevated rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{m.name || m.email}</p>
                <p className="text-xs text-text-muted truncate">{m.email}</p>
              </div>
              <span className="text-xs text-text-muted flex-shrink-0">{roleLabel[m.role] ?? m.role}</span>
            </div>
          ))}
          {!isLoading && (members ?? []).length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Nenhum membro encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

function EquipesSection() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const [newTeamName, setNewTeamName] = useState('');

  const handleCreate = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    try {
      await createTeam.mutateAsync(name);
      setNewTeamName('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Equipes</h2>
        <p className="text-sm text-text-muted mt-1">Organize membros em equipes dentro do workspace.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nome da equipe"
          className="flex-1 bg-bg-page text-text-primary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-w-0 placeholder-text-muted"
        />
        <button
          onClick={handleCreate}
          disabled={!newTeamName.trim() || createTeam.isPending}
          className="px-3 sm:px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Criar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map((t) => (
            <div key={t.team_id} className="flex items-center gap-3 p-3 bg-bg-surface rounded-lg">
              <UsersRound className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-text-primary truncate">{t.name}</span>
              <button
                onClick={() => deleteTeam.mutate(t.team_id)}
                disabled={deleteTeam.isPending}
                className="text-text-muted hover:text-red-500 transition-colors"
                title="Remover equipe"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!isLoading && (teams ?? []).length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Nenhuma equipe criada ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StubSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted mt-1">{description}</p>
      </div>
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-sm text-text-muted font-medium">Em breve</p>
        <p className="text-xs text-text-muted mt-1">Esta funcionalidade estará disponível em breve.</p>
      </div>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, initialSection = 'conta' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveSection(initialSection);
      setShowMobileNav(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const groups = ['Pessoal', 'Workspace'];
  const activeItem = NAV_ITEMS.find((i) => i.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'conta':
        return <Settings />;
      case 'workspace':
        return <WorkspaceSection onClose={onClose} />;
      case 'importacao':
        return <ImportacaoSection />;
      case 'membros':
        return <MembrosSection />;
      case 'equipes':
        return <EquipesSection />;
      case 'administradores':
        return <StubSection title="Administradores" description="Gerencie os administradores do workspace." />;
      case 'notificacoes':
        return <NotificationSettings />;
      case 'integracoes':
        return <StubSection title="Integrações" description="Conecte o workspace com ferramentas externas." />;
    }
  };

  const handleNavSelect = (id: Section) => {
    setActiveSection(id);
    setShowMobileNav(false);
  };

  const SidebarNav = (
    <div className="py-4 px-2 sm:py-6 sm:px-3">
      {groups.map((group) => {
        const items = NAV_ITEMS.filter((i) => i.group === group);
        return (
          <div key={group} className="mb-5">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-3 mb-1">
              {group}
            </p>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavSelect(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  activeSection === item.id
                    ? 'bg-bg-page text-text-primary font-medium shadow-sm border border-border'
                    : 'text-text-secondary hover:bg-bg-page hover:text-text-primary'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="flex items-stretch sm:items-center justify-center min-h-screen sm:p-4">
        <div className="relative bg-bg-page sm:rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden sm:max-h-[90vh] min-h-screen sm:min-h-0 h-screen sm:h-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 px-4 py-3 border-b border-border sm:hidden bg-bg-surface flex-shrink-0">
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              {activeItem?.icon}
              {activeItem?.label}
            </div>
          </div>

          <div className="flex flex-1 min-h-0 relative">
            {showMobileNav && (
              <div className="absolute inset-0 z-10 sm:hidden">
                <div
                  className="absolute inset-0 bg-black bg-opacity-20"
                  onClick={() => setShowMobileNav(false)}
                />
                <div className="absolute left-0 top-0 bottom-0 w-56 bg-bg-surface overflow-y-auto shadow-lg border-r border-border">
                  {SidebarNav}
                </div>
              </div>
            )}

            <div className="hidden sm:block w-52 flex-shrink-0 border-r border-border overflow-y-auto bg-bg-surface">
              {SidebarNav}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
