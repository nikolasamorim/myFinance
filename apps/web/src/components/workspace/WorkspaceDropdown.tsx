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

  // Close on outside click
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

  // Focus input when new workspace form appears
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
          'w-full flex items-center rounded-lg transition-colors hover:bg-gray-100',
          isCollapsed ? 'justify-center p-2' : 'gap-2 px-2 py-1.5'
        )}
        title={isCollapsed ? currentWorkspace?.workspace_name ?? 'Workspace' : undefined}
      >
        <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
          {getWorkspaceIcon(currentWorkspace)}
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 text-left text-sm font-medium text-gray-900 truncate">
              {currentWorkspace?.workspace_name ?? 'Workspace'}
            </span>
            <ChevronDown className={cn('w-4 h-4 flex-shrink-0 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-fit min-w-[260px]',
            isCollapsed ? 'left-full ml-2 top-0' : 'left-0 right-0 top-full mt-1'
          )}
        >
          {/* Workspace header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {getWorkspaceIcon(currentWorkspace)}
              </span>
              <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                {currentWorkspace?.workspace_name ?? 'Workspace'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenSettings}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações
              </button>
              <button
                disabled
                title="Em breve"
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 rounded-md cursor-not-allowed"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Convidar
              </button>
              <button
                onClick={() => setShowThemeMenu((v) => !v)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                  showThemeMenu
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                )}
              >
                <Palette className="w-3.5 h-3.5" />
                Tema
              </button>
            </div>

            {showThemeMenu && (
              <div className="mt-2 flex gap-1.5">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors border',
                      theme === value
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {theme === value && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workspace list */}
          <div className="py-1 border-b border-gray-100">
            {workspaces.map((ws) => (
              <button
                key={ws.workspace_id}
                onClick={() => { setCurrentWorkspace(ws); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {getWorkspaceIcon(ws)}
                </span>
                <span className="flex-1 text-left truncate">{ws.workspace_name}</span>
                {ws.workspace_id === currentWorkspace?.workspace_id && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
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
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim() || creating}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? '...' : 'Criar'}
                </button>
                <button
                  onClick={() => { setShowNewWorkspace(false); setNewWorkspaceName(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewWorkspace(true)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo workspace
              </button>
            )}
          </div>

          {/* User section */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
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
