import React, { useState } from 'react';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Dropdown } from '../ui/Dropdown';

export function Navbar() {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace, loading } = useWorkspace();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.workspace_id,
    label: workspace.workspace_name,
    icon: workspace.workspace_icon ? (
      <span className="text-lg">{workspace.workspace_icon}</span>
    ) : (
      <div className="w-5 h-5 bg-gray-300 rounded-full" />
    ),
  }));

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.workspace_id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <img src="navbar-logo.png"></img>
            <h1 className="text-lg font-bold text-gray-900">Azami</h1>
          </div>
          
          {loading ? (
            <div className="w-48 h-8 bg-gray-200 rounded-lg animate-pulse" />
          ) : (
            <div className="w-40">
              <Dropdown
                options={workspaceOptions}
                value={currentWorkspace?.workspace_id}
                onChange={handleWorkspaceChange}
                placeholder="Selecione um workspace"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">{user?.name}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 py-0.5 z-10">
                <button className="w-full flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Configurações
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}