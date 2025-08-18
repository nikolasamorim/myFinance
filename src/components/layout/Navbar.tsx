import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Building, Users, X, LayoutDashboard, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, CreditCard, Wallet, Tag, Target } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Dropdown } from '../ui/Dropdown';
import { SidebarToggleButton } from '../ui/SidebarToggleButton';
import { Sidebar } from './Sidebar';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, setCurrentWorkspace, loading } = useWorkspace();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <>
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Workspace Selector */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
            {/* Sidebar Toggle Button */}
            <div className="lg:hidden">
              <SidebarToggleButton onMobileToggle={() => setShowMobileSidebar(true)} />
            </div>
            <div className="hidden lg:block">
              <SidebarToggleButton />
            </div>
            
            {/* Logo */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <img src="/logo-black.png" width="20" height="20" alt="Logo" className="sm:w-6 sm:h-6 md:w-7 md:h-7" />
              <h1 className="font-serifTitle font-bold text-gray-900 hidden sm:block mr-3">Azami</h1> 
            </div>
            
            {/* Workspace Selector */}
            {loading ? (
              <div className="w-24 sm:w-32 md:w-40 lg:w-48 h-8 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            ) : (
              <div className="w-24 sm:w-32 md:w-40 lg:w-48 flex-shrink-0 min-w-0">
                <Dropdown
                  options={workspaceOptions}
                  value={currentWorkspace?.workspace_id}
                  onChange={handleWorkspaceChange}
                  placeholder="Workspace"
                  className="text-xs sm:text-sm"
                  isMobile={isMobile}
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
                      navigate('/history');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <HistoryIcon className="w-4 h-4 mr-3" />
                    Histórico
                  </button>
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
      </nav>

      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMobileSidebar(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 max-w-xs">
            <div className="flex flex-col h-full bg-white border-r border-gray-200">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-6 overflow-y-auto p-4">
                {/* Dashboard - No grouping */}
                <div className="space-y-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setShowMobileSidebar(false)}
                    className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <LayoutDashboard className="w-5 h-5 text-blue-600" />
                    <span>Dashboard</span>
                  </Link>
                </div>

                {/* Gerenciadores */}
                <div className="space-y-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Gerenciadores
                  </h3>
                  <div className="space-y-1 pl-2">
                    <Link
                      to="/gerenciadores/receitas"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span>Receitas</span>
                    </Link>
                    <Link
                      to="/gerenciadores/despesas"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span>Despesas</span>
                    </Link>
                    <Link
                      to="/gerenciadores/dividas"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span>Dívidas</span>
                    </Link>
                    <Link
                      to="/gerenciadores/investimentos"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <PiggyBank className="w-5 h-5 text-blue-600" />
                      <span>Investimentos</span>
                    </Link>
                  </div>
                </div>
                {/* Organizadores */}
                <div className="space-y-2">
                  <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Organizadores
                  </h3>
                  <div className="space-y-1 pl-2">
                    <Link
                      to="/organizadores/instituicoes"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Building className="w-5 h-5 text-blue-600" />
                      <span>Instituições</span>
                    </Link>
                    <Link
                      to="/organizadores/cartoes"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <span>Cartões de Crédito</span>
                    </Link>
                    <Link
                      to="/organizadores/contas"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Wallet className="w-5 h-5 text-green-600" />
                      <span>Caixa / Conta</span>
                    </Link>
                    <Link
                      to="/organizadores/categorias"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Tag className="w-5 h-5 text-yellow-600" />
                      <span>Categoria</span>
                    </Link>
                    <Link
                      to="/organizadores/centros-de-custo"
                      onClick={() => setShowMobileSidebar(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 space-x-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Target className="w-5 h-5 text-indigo-600" />
                      <span>Centro de Custo</span>
                    </Link>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}