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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { useTeams, useCreateTeam, useDeleteTeam } from '../../hooks/useTeams';
import { workspaceService } from '../../services/workspace.service';
import { getWorkspaceIcon } from '../../lib/workspaceUtils';
import { Settings } from '../../pages/Settings';
import { NotificationSettings } from '../../pages/NotificationSettings';

type Section =
  | 'conta'
  | 'workspace'
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
  { id: 'membros', label: 'Membros', icon: <Users className="w-4 h-4" />, group: 'Workspace' },
  { id: 'equipes', label: 'Equipes', icon: <UsersRound className="w-4 h-4" />, group: 'Workspace' },
  { id: 'administradores', label: 'Administradores', icon: <ShieldCheck className="w-4 h-4" />, group: 'Workspace' },
  { id: 'integracoes', label: 'Integrações', icon: <Plug className="w-4 h-4" />, group: 'Workspace' },
];

function WorkspaceSection() {
  const { currentWorkspace, refetchWorkspaces } = useWorkspace();
  const [name, setName] = useState(currentWorkspace?.workspace_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentWorkspace?.workspace_name ?? '');
    setIconPreview(null);
  }, [currentWorkspace?.workspace_id]);

  const handleSave = async () => {
    if (!currentWorkspace || !name.trim()) return;
    try {
      setSaving(true);
      await workspaceService.updateWorkspace(currentWorkspace.workspace_id, { workspace_name: name.trim() });
      await refetchWorkspaces();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const iconSrc = iconPreview || currentWorkspace?.workspace_icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Workspace</h2>
        <p className="text-sm text-text-muted mt-1">Gerencie as configurações do seu workspace.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Ícone / Foto</label>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 bg-bg-elevated rounded-xl flex items-center justify-center text-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => iconInputRef.current?.click()}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="Workspace icon" className="w-full h-full object-cover" />
                ) : (
                  getWorkspaceIcon(currentWorkspace)
                )}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-white hover:bg-accent-hover"
                onClick={() => iconInputRef.current?.click()}
                disabled={uploadingIcon}
              >
                {uploadingIcon ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-2.5 h-2.5" />
                )}
              </button>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconChange}
              />
            </div>
            <div className="text-sm text-text-muted">
              <p>Clique para alterar o ícone do workspace.</p>
              <p className="text-xs mt-0.5">PNG, JPG ou GIF. Máx. 2MB.</p>
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
          <p className="text-sm text-text-secondary capitalize">{currentWorkspace?.workspace_type}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>
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
        return <WorkspaceSection />;
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
