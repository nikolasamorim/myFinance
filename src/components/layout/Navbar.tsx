import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Building, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Dropdown } from '../ui/Dropdown';
import { SidebarToggleButton } from '../ui/SidebarToggleButton';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, setCurrentWorkspace, loading } = useWorkspace();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const getWorkspaceIcon = (workspace: any) => {
    if (workspace.workspace_icon) {
      return <span className="text-lg">{workspace.workspace_icon}</span>;
    }
    
    // Default icons based on workspace type
    switch (workspace.workspace_type) {
      case 'family':
        return <Users className="w-4 h-4 text-gray-600" />;
      case 'business':
        return <Building className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const workspaceOptions = workspaces.map(workspace => ({
    value: workspace.workspace_id,
    label: workspace.workspace_name,
    icon: getWorkspaceIcon(workspace),
  }));

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.workspace_id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    // TODO: Implement notifications panel
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo and Workspace Selector */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          {/* Sidebar Toggle Button - Desktop only */}
          <SidebarToggleButton />
          
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo-black.png" width="24" height="24" alt="Logo" className="md:w-7 md:h-7" />
            <h1 className="text-base md:text-lg font-bold text-gray-900 hidden sm:block">Azami</h1>
          </div>
          
          {/* Workspace Selector */}
          {loading ? (
            <div className="w-32 md:w-48 h-8 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
          ) : (
            <div className="w-32 md:w-48 flex-shrink-0">
              <Dropdown
                options={workspaceOptions}
                value={currentWorkspace?.workspace_id}
                onChange={handleWorkspaceChange}
                placeholder="Workspace"
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Right side - Notifications and User Menu */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={handleNotificationClick}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge - example */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500 text-center">Nenhuma notificação no momento</p>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 md:p-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              {/* Avatar */}
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                <User className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              
              {/* User info - only show on desktop */}
              <div className="hidden md:block text-left">
                <span className="text-sm font-medium block">{user?.name}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* Mobile-only user info */}
                <div className="md:hidden px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                
                <button 
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Configurações
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </nav>
  );
}