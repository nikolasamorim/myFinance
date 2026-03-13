import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
  Wallet,
  Tag,
  Target,
  CreditCard,
  LayoutDashboard,
  SquareKanban,
  Bell,
  User,
  LogOut,
  Settings,
  History,
  SunMoon,
  Users,
  Building,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { Dropdown } from '../ui/Dropdown';
import { useTheme } from '../../hooks/useTheme';
import { SidebarToggleButton } from '../ui/SidebarToggleButton';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

function SidebarItem({ to, icon, label, isActive, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'min-w-0 flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden',
        isCollapsed ? 'justify-center' : 'space-x-3',
        isActive
          ? 'bg-white text-gray-800 border border-gray-200 shadow-sm'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>

      {!isCollapsed && (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
    </Link>
  );
}

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isCollapsed?: boolean;
}

function SidebarGroup({ title, children, defaultExpanded = false, isCollapsed }: SidebarGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const shouldShowContent = isCollapsed || isExpanded;

  return (
    <div className="space-y-2 min-w-0">
      {!isCollapsed && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-0 flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        >
          {/* ✅ titulo com truncate também */}
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>
      )}

      {shouldShowContent && (
        <div className={cn('space-y-1 transition-all duration-200 min-w-0', isCollapsed ? 'pl-0' : 'pl-2')}>
          {children}
        </div>
      )}
    </div>
  );
}

type SidebarExternalControlProps =
  | {
      mobileOpen: boolean;
      onMobileClose: () => void;
      onMobileOpen?: () => void;
    }
  | {
      mobileOpen?: undefined;
      onMobileClose?: undefined;
      onMobileOpen?: undefined;
    };

interface SidebarContentProps {
  onAnyNavigate?: () => void;
  showMobileHeader?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ onAnyNavigate, showMobileHeader, onMobileClose }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace, loading } = useWorkspace();
  const { toggle } = useTheme();

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: unreadCount } = useUnreadNotificationCount();

  const getWorkspaceIcon = (workspace: any) => {
    if (workspace?.workspace_icon) return <span className="text-lg">{workspace.workspace_icon}</span>;

    switch (workspace?.workspace_type) {
      case 'family':
        return <Users className="w-4 h-4 text-gray-600" />;
      case 'business':
        return <Building className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const workspaceOptions = useMemo(
    () =>
      (workspaces || []).map((workspace: any) => ({
        value: workspace.workspace_id,
        label: workspace.workspace_name,
        icon: getWorkspaceIcon(workspace),
      })),
    [workspaces]
  );

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = (workspaces || []).find((w: any) => w.workspace_id === workspaceId);
    if (workspace) setCurrentWorkspace(workspace);
  };

  const managerItems = [
    { to: '/gerenciadores/receitas', icon: <TrendingUp className="w-5 h-5 text-gray-600" />, label: 'Receitas' },
    { to: '/gerenciadores/despesas', icon: <TrendingDown className="w-5 h-5 text-gray-600" />, label: 'Despesas' },
    // { to: '/gerenciadores/dividas', icon: <AlertTriangle className="w-5 h-5 text-gray-600" />, label: 'Dívidas' },
    // { to: '/gerenciadores/investimentos', icon: <PiggyBank className="w-5 h-5 text-gray-600" />, label: 'Investimentos' },
  ];

  const organizadorItems = [
    { to: '/organizadores/contas', icon: <Wallet className="w-5 h-5 text-gray-600" />, label: 'Caixa / Conta' },
    { to: '/organizadores/cartoes', icon: <CreditCard className="w-5 h-5 text-gray-600" />, label: 'Cartões de Crédito' },
    { to: '/organizadores/categorias', icon: <Tag className="w-5 h-5 text-gray-600" />, label: 'Categoria' },
    { to: '/organizadores/centros-de-custo', icon: <Target className="w-5 h-5 text-gray-600" />, label: 'Centro de Custo' },
  ];

  const closeAllBottomMenus = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    closeAllBottomMenus();
    onAnyNavigate?.();
  };

  return (
    <div
      className={cn(
        'min-w-0 flex flex-col h-full min-h-0 transition-all duration-300 border-gray-200',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >

      {/* Top: Logo + Workspace */}
      <div className={cn('border-b border-gray-200 min-w-0', isCollapsed ? 'p-2' : 'p-4')}>
        <div className={cn('min-w-0 flex items-center', isCollapsed ? 'justify-center' : 'gap-2')}>
          {!isCollapsed && (
            <>
            <img src="/logo-black.png" width="22" height="22" alt="Logo" className="w-6 h-6 flex-shrink-0" />
            <h1 className="min-w-0 flex-1 truncate font-serifTitle font-bold text-gray-900 leading-none">
              Azami
            </h1>
            </>
          )}

        <div className="hidden lg:block">
          <SidebarToggleButton />
        </div>
        
        {/* Mobile Header */}
        {showMobileHeader && (
          <div className={cn('min-w-0 flex items-center lg:hidden', isCollapsed ? 'justify-center p-2' : 'justify-between')}>
            <button
              onClick={() => {
                closeAllBottomMenus();
                onMobileClose?.();
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        </div>

        {/* Workspace selector */}
        <div className={cn('mt-3 min-w-0', isCollapsed ? 'hidden' : 'block')}>
          {loading ? (
            <div className="w-full h-9 bg-gray-200 rounded-lg animate-pulse" />
          ) : (
            <div className="min-w-0">
              {/* Dropdown já deve cuidar do truncate internamente, mas se precisar, envolvemos */}
              <Dropdown
                options={workspaceOptions}
                value={currentWorkspace?.workspace_id}
                onChange={handleWorkspaceChange}
                placeholder="Workspace"
                className="text-sm"
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'min-w-0 min-h-0 flex-1 space-y-5 overflow-y-auto',
          isCollapsed ? 'p-2' : 'p-4'
        )}
        onClick={() => closeAllBottomMenus()}
      >
        <div className="space-y-2 min-w-0">
          <SidebarItem
            to="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5 text-gray-600" />}
            label="Dashboard"
            isActive={location.pathname === '/dashboard'}
            isCollapsed={isCollapsed}
            onClick={onAnyNavigate}
          />

          <SidebarItem
            to="/invoice"
            icon={<SquareKanban className="w-5 h-5 text-gray-600" />}
            label="Fatura"
            isActive={location.pathname === '/invoice'}
            isCollapsed={isCollapsed}
            onClick={onAnyNavigate}
          />
        </div>

        <SidebarGroup title="Gerenciadores" isCollapsed={isCollapsed}>
          {managerItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.to}
              isCollapsed={isCollapsed}
              onClick={onAnyNavigate}
            />
          ))}
        </SidebarGroup>

        <SidebarGroup title="Organizadores" isCollapsed={isCollapsed}>
          {organizadorItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.to}
              isCollapsed={isCollapsed}
              onClick={onAnyNavigate}
            />
          ))}
        </SidebarGroup>
      </nav>

      {/* Bottom fixed actions */}
      <div className={cn('border-t border-gray-200 min-w-0', isCollapsed ? 'p-2' : 'p-3')}>
        <div className="relative min-w-0">
          {/* Notifications */}
          <div className="relative min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications((v) => !v);
                setShowUserMenu(false);
              }}
              className={cn(
                'w-full min-w-0 overflow-hidden flex items-center rounded-lg transition-colors',
                isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2',
                'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
              title="Notificações"
            >
              <span className={cn('min-w-0 flex items-center', isCollapsed ? '' : 'gap-3', isCollapsed ? '' : 'flex-1')}>
                <span className="flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </span>

                {!isCollapsed && (
                  <span className="min-w-0 truncate text-sm font-medium text-left">Notificações</span>
                )}
              </span>

              {!isCollapsed && (unreadCount ?? 0) > 0 && (
                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className={cn(
                  'absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200',
                  'bottom-full mb-2',
                  isCollapsed ? 'left-full ml-2 w-72' : 'left-0 right-0'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <NotificationPanel onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>

          <div className="h-2" />

          {/* User menu */}
          <div className="relative min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu((v) => !v);
                setShowNotifications(false);
              }}
              className={cn(
                'w-full min-w-0 overflow-hidden flex items-center rounded-lg transition-colors',
                isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2',
                'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
              title="Usuário"
            >
              <span className={cn('min-w-0 flex items-center', isCollapsed ? '' : 'gap-3', isCollapsed ? '' : 'flex-1')}>
                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <div className="min-w-0 ">
                    <p className="text-sm font-medium text-gray-900 truncate text-left">
                      {user?.name || user?.email || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 truncate text-left">
                      {user?.email || ''}
                    </p>
                  </div>
                )}
              </span>

              {!isCollapsed && (
                <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', showUserMenu && 'rotate-180')} />
              )}
            </button>

            {showUserMenu && (
              <div
                className={cn(
                  'absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1',
                  'bottom-full mb-2',
                  isCollapsed ? 'left-full ml-2 w-56' : 'left-0 right-0'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleNavigate('/settings')}
                  className="min-w-0 w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="min-w-0 truncate">Configurações</span>
                </button>

                <button
                  onClick={() => handleNavigate('/history')}
                  className="min-w-0 w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <History className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="min-w-0 truncate">Histórico</span>
                </button>

                <button
                  onClick={() => {
                    toggle();
                    closeAllBottomMenus();
                  }}
                  className="min-w-0 w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <SunMoon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="min-w-0 truncate">Alterar Tema (Beta)</span>
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  onClick={() => {
                    logout();
                    closeAllBottomMenus();
                  }}
                  className="min-w-0 w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="min-w-0 truncate">Sair</span>
                </button>
              </div>
            )}
          </div>

          {/* Click-outside */}
          {(showNotifications || showUserMenu) && (
            <div className="fixed inset-0 z-40" onClick={() => closeAllBottomMenus()} />
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarExternalControlProps) {
  const { isCollapsed } = useSidebar();

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const mobileOpen = props.mobileOpen ?? internalMobileOpen;
  const onMobileClose = props.onMobileClose ?? (() => setInternalMobileOpen(false));

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className={cn('transition-all duration-300', isCollapsed ? 'w-16' : 'w-64')}>
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className=" fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50 ignoreOverride" onClick={onMobileClose} />
          <div className="bg-gray-100 fixed inset-y-0 left-0">
            <SidebarContent showMobileHeader onMobileClose={onMobileClose} onAnyNavigate={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
