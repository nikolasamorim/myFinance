import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setName(currentWorkspace?.workspace_name ?? '');
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Workspace</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie as configurações do seu workspace.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ícone</label>
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
            {getWorkspaceIcon(currentWorkspace)}
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
          Convidar membro
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
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newTeamName.trim() || createTeam.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Criar
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveSection(initialSection);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const groups = ['Pessoal', 'Workspace'];

  const renderContent = () => {
    switch (activeSection) {
      case 'conta':
        return (
          <div className="-mx-6 -my-4">
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
          <div className="-mx-6 -my-4">
            <NotificationSettings />
          </div>
        );
      case 'integracoes':
        return <StubSection title="Integrações" description="Conecte o workspace com ferramentas externas." />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 ignoreOverride"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[90vh]">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar nav */}
            <div className="w-52 flex-shrink-0 border-r border-gray-200 py-6 px-3 overflow-y-auto bg-gray-50">
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
                        onClick={() => setActiveSection(item.id)}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
