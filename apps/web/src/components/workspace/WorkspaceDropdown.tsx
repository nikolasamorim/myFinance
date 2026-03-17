import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Settings,
  UserPlus,
  Check,
  Plus,
  LogOut,
  User,
  X,
  Sun,
  Moon,
  Monitor,
  Palette,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { getWorkspaceIcon } from '../../lib/workspaceUtils';
import { workspaceService } from '../../services/workspace.service';
import { SettingsModal } from './SettingsModal';

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Claro', icon: Sun },
  { value: 'dark' as const, label: 'Escuro', icon: Moon },
  { value: 'system' as const, label: 'Sistema', icon: Monitor },
];

export function WorkspaceDropdown() {
  const { isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace, refetchWorkspaces } = useWorkspace();
  const { theme, setTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNewWorkspace(false);
        setNewWorkspaceName('');
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (showNewWorkspace) inputRef.current?.focus();
  }, [showNewWorkspace]);

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      await workspaceService.createWorkspace(name, 'personal');
      await refetchWorkspaces();
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
    } catch (e) {
      console.error('Failed to create workspace', e);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSettings = () => {
    setIsOpen(false);
    setShowSettings(true);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center rounded-lg transition-colors hover:bg-bg-elevated',
          isCollapsed ? 'justify-center p-2' : 'gap-2 px-2 py-1.5'
        )}
        title={isCollapsed ? currentWorkspace?.workspace_name ?? 'Workspace' : undefined}
      >
        <span className="flex-shrink-0 w-6 h-6 bg-bg-elevated rounded-md flex items-center justify-center overflow-hidden">
          {getWorkspaceIcon(currentWorkspace)}
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 text-left text-sm font-medium text-text-primary truncate">
              {currentWorkspace?.workspace_name ?? 'Workspace'}
            </span>
            <ChevronDown className={cn('w-4 h-4 flex-shrink-0 text-text-muted transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 bg-bg-page rounded-xl shadow-xl border border-border py-1 w-fit min-w-[260px]',
            isCollapsed ? 'left-full ml-2 top-0' : 'left-0 right-0 top-full mt-1'
          )}
        >
          {/* Workspace header */}
          <div className="px-3 pt-3 pb-1 border-b border-border">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 bg-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {getWorkspaceIcon(currentWorkspace)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {currentWorkspace?.workspace_name ?? 'Workspace'}
                </p>
                <p className="text-xs text-text-muted">Workspace pessoal</p>
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-0.5 mb-2">
              <button
                onClick={handleOpenSettings}
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-text-secondary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <span className="w-7 h-7 bg-bg-surface rounded-md flex items-center justify-center flex-shrink-0">
                  <Settings className="w-3.5 h-3.5 text-text-muted" />
                </span>
                <span className="flex-1 text-left font-medium">Configurações</span>
              </button>

              <button
                disabled
                title="Em breve"
                className="w-full flex items-center gap-3 px-2 py-2 text-sm text-text-muted rounded-lg cursor-not-allowed"
              >
                <span className="w-7 h-7 bg-bg-surface rounded-md flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-text-muted opacity-40" />
                </span>
                <span className="flex-1 text-left font-medium">Convidar membros</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded-full">Em breve</span>
              </button>

              {/* Tema row */}
              <button
                onClick={() => setShowThemeMenu((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg transition-colors',
                  showThemeMenu ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
                  showThemeMenu ? 'bg-accent/10' : 'bg-bg-surface'
                )}>
                  <Palette className={cn('w-3.5 h-3.5', showThemeMenu ? 'text-accent' : 'text-text-muted')} />
                </span>
                <span className={cn('flex-1 text-left font-medium', showThemeMenu ? 'text-accent' : 'text-text-secondary')}>
                  Tema
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  {THEME_OPTIONS.find(o => o.value === theme)?.label}
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showThemeMenu && 'rotate-180')} />
                </span>
              </button>

              {showThemeMenu && (
                <div className="mx-2 mt-1 mb-1 grid grid-cols-3 gap-1.5">
                  {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all border',
                        theme === value
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-bg-surface border-border text-text-muted hover:bg-bg-elevated hover:border-border'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', theme === value ? 'text-accent' : 'text-text-muted')} />
                      <span>{label}</span>
                      {theme === value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Workspace list */}
          <div className="py-1 border-b border-border">
            {workspaces.map((ws) => (
              <button
                key={ws.workspace_id}
                onClick={() => { setCurrentWorkspace(ws); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                <span className="w-6 h-6 bg-bg-elevated rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {getWorkspaceIcon(ws)}
                </span>
                <span className="flex-1 text-left truncate">{ws.workspace_name}</span>
                {ws.workspace_id === currentWorkspace?.workspace_id && (
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                )}
              </button>
            ))}

            {/* New workspace */}
            {showNewWorkspace ? (
              <div className="px-3 py-1.5 flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') { setShowNewWorkspace(false); setNewWorkspaceName(''); }
                  }}
                  placeholder="Nome do workspace"
                  className="flex-1 text-sm bg-bg-surface text-text-primary border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-accent placeholder-text-muted"
                />
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim() || creating}
                  className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {creating ? '...' : 'Criar'}
                </button>
                <button
                  onClick={() => { setShowNewWorkspace(false); setNewWorkspaceName(''); }}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewWorkspace(true)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-text-muted hover:bg-bg-elevated transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo workspace
              </button>
            )}
          </div>

          {/* User section */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 bg-bg-elevated rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                <User className="w-4 h-4 text-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name || user?.email}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Settings modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
