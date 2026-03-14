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

// ─── Section: Workspace ───────────────────────────────────────────────────────

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

    // Show preview
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
        <h2 className="text-lg font-semibold text-gray-900">Workspace</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie as configurações do seu workspace.</p>
      </div>

      <div className="space-y-4">
        {/* Icon upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ícone / Foto</label>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => iconInputRef.current?.click()}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="Workspace icon" className="w-full h-full object-cover" />
                ) : (
                  getWorkspaceIcon(currentWorkspace)
                )}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700"
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
            <div className="text-sm text-gray-500">
              <p>Clique para alterar o ícone do workspace.</p>
              <p className="text-xs mt-0.5">PNG, JPG ou GIF. Máx. 2MB.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do workspace</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <p className="text-sm text-gray-600 capitalize">{currentWorkspace?.workspace_type}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Membros ─────────────────────────────────────────────────────────

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
          <h2 className="text-lg font-semibold text-gray-900">Membros</h2>
          <p className="text-sm text-gray-500 mt-1">Pessoas com acesso a este workspace.</p>
        </div>
        <button
          disabled
          title="Em breve"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Convidar membro</span>
          <span className="sm:hidden">Convidar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name || m.email}</p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">{roleLabel[m.role] ?? m.role}</span>
            </div>
          ))}
          {!isLoading && (members ?? []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum membro encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section: Equipes ─────────────────────────────────────────────────────────

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
        <h2 className="text-lg font-semibold text-gray-900">Equipes</h2>
        <p className="text-sm text-gray-500 mt-1">Organize membros em equipes dentro do workspace.</p>
      </div>

      {/* Create team */}
      <div className="flex gap-2">
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nome da equipe"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
        />
        <button
          onClick={handleCreate}
          disabled={!newTeamName.trim() || createTeam.isPending}
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Criar</span>
        </button>
      </div>

      {/* Team list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map((t) => (
            <div key={t.team_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <UsersRound className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">{t.name}</span>
              <button
                onClick={() => deleteTeam.mutate(t.team_id)}
                disabled={deleteTeam.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remover equipe"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!isLoading && (teams ?? []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma equipe criada ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section: Stub ────────────────────────────────────────────────────────────

function StubSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400 font-medium">Em breve</p>
        <p className="text-xs text-gray-400 mt-1">Esta funcionalidade estará disponível em breve.</p>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

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
        return (
          <div className="-mx-4 sm:-mx-6 -my-4">
            <Settings />
          </div>
        );
      case 'workspace':
        return <WorkspaceSection />;
      case 'membros':
        return <MembrosSection />;
      case 'equipes':
        return <EquipesSection />;
      case 'administradores':
        return <StubSection title="Administradores" description="Gerencie os administradores do workspace." />;
      case 'notificacoes':
        return (
          <div className="-mx-4 sm:-mx-6 -my-4">
            <NotificationSettings />
          </div>
        );
      case 'integracoes':
        return <StubSection title="Integrações" description="Conecte o workspace com ferramentas externas." />;
    }
  };

  const handleNavSelect = (id: Section) => {
    setActiveSection(id);
    setShowMobileNav(false);
  };

  const Sidebar = (
    <div className="py-4 px-2 sm:py-6 sm:px-3">
      {groups.map((group) => {
        const items = NAV_ITEMS.filter((i) => i.group === group);
        return (
          <div key={group} className="mb-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
              {group}
            </p>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavSelect(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  activeSection === item.id
                    ? 'bg-white text-gray-900 font-medium shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
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
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 ignoreOverride"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex items-stretch sm:items-center justify-center min-h-screen sm:p-4">
        <div className="relative bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden sm:max-h-[90vh] min-h-screen sm:min-h-0 h-screen sm:h-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Mobile header bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 sm:hidden bg-gray-50 flex-shrink-0">
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              {activeItem?.icon}
              {activeItem?.label}
            </div>
          </div>

          <div className="flex flex-1 min-h-0 relative">
            {/* Mobile nav overlay */}
            {showMobileNav && (
              <div className="absolute inset-0 z-10 sm:hidden">
                <div
                  className="absolute inset-0 bg-black bg-opacity-20"
                  onClick={() => setShowMobileNav(false)}
                />
                <div className="absolute left-0 top-0 bottom-0 w-56 bg-gray-50 overflow-y-auto shadow-lg border-r border-gray-200">
                  {Sidebar}
                </div>
              </div>
            )}

            {/* Desktop sidebar nav */}
            <div className="hidden sm:block w-52 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50">
              {Sidebar}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
