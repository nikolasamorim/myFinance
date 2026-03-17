import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Tag,
  Target,
  CreditCard,
  LayoutDashboard,
  SquareKanban,
  Bell,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useSidebar } from '../../context/SidebarContext';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { SidebarToggleButton } from '../ui/SidebarToggleButton';
import { WorkspaceDropdown } from '../workspace/WorkspaceDropdown';

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
          ? 'bg-bg-page text-text-primary border border-border shadow-sm'
          : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
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
    <div className="min-w-0">
      {!isCollapsed && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-0 flex items-center justify-between w-full px-3 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
        >
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>
      )}

      {shouldShowContent && (
        <div className={cn('transition-all duration-200 min-w-0', isCollapsed ? 'pl-0' : 'pl-2')}>
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
  const { isCollapsed } = useSidebar();

  const [showNotifications, setShowNotifications] = useState(false);
  const { data: unreadCount } = useUnreadNotificationCount();

  const managerItems = [
    { to: '/gerenciadores/receitas', icon: <TrendingUp className="w-5 h-5 text-text-muted" />, label: 'Receitas' },
    { to: '/gerenciadores/despesas', icon: <TrendingDown className="w-5 h-5 text-text-muted" />, label: 'Despesas' },
  ];

  const organizadorItems = [
    { to: '/organizadores/contas', icon: <Wallet className="w-5 h-5 text-text-muted" />, label: 'Caixa / Conta' },
    { to: '/organizadores/cartoes', icon: <CreditCard className="w-5 h-5 text-text-muted" />, label: 'Cartões de Crédito' },
    { to: '/organizadores/categorias', icon: <Tag className="w-5 h-5 text-text-muted" />, label: 'Categoria' },
    { to: '/organizadores/centros-de-custo', icon: <Target className="w-5 h-5 text-text-muted" />, label: 'Centro de Custo' },
  ];

  return (
    <div
      className={cn(
        'min-w-0 flex flex-col h-full min-h-0 transition-all duration-300 border-border',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >

      {/* Top: Logo + Workspace */}
      <div className={cn('border-b border-border min-w-0', isCollapsed ? 'p-2' : 'p-4')}>
        <div className={cn('min-w-0 flex items-center', isCollapsed ? 'justify-center' : 'gap-2')}>
          {!isCollapsed && (
            <>
              <img src="/logo-black.png" width="22" height="22" alt="Logo" className="w-6 h-6 flex-shrink-0 dark:hidden" />
              <img src="/logo-white.png" width="22" height="22" alt="Logo" className="w-6 h-6 flex-shrink-0 hidden dark:block" />
              <h1 className="min-w-0 flex-1 truncate font-serifTitle font-bold text-text-primary leading-none">
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
                  setShowNotifications(false);
                  onMobileClose?.();
                }}
                className="p-2 text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Workspace dropdown */}
        <div className={cn('mt-3 min-w-0', isCollapsed ? 'hidden' : 'block')}>
          <WorkspaceDropdown />
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'min-w-0 min-h-0 flex-1 space-y-3 overflow-y-auto',
          isCollapsed ? 'p-2' : 'p-4'
        )}
        onClick={() => setShowNotifications(false)}
      >
        <div className="min-w-0">
          <SidebarItem
            to="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5 text-text-muted" />}
            label="Dashboard"
            isActive={location.pathname === '/dashboard'}
            isCollapsed={isCollapsed}
            onClick={onAnyNavigate}
          />

          <SidebarItem
            to="/invoice"
            icon={<SquareKanban className="w-5 h-5 text-text-muted" />}
            label="Fatura"
            isActive={location.pathname === '/invoice'}
            isCollapsed={isCollapsed}
            onClick={onAnyNavigate}
          />
        </div>

        <SidebarGroup title="Gerenciadores" isCollapsed={isCollapsed} defaultExpanded={true}>
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

      {/* Bottom fixed actions — notifications only */}
      <div className={cn('border-t border-border min-w-0', isCollapsed ? 'p-2' : 'p-3')}>
        <div className="relative min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNotifications((v) => !v);
            }}
            className={cn(
              'w-full min-w-0 overflow-hidden flex items-center rounded-lg transition-colors',
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2',
              'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
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
                'absolute z-50 bg-bg-page rounded-lg shadow-lg border border-border',
                'bottom-full mb-2',
                isCollapsed ? 'left-full ml-2 w-72' : 'left-0 right-0'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            </div>
          )}

          {showNotifications && (
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onMobileClose} />
          <div className="bg-bg-surface fixed inset-y-0 left-0">
            <SidebarContent showMobileHeader onMobileClose={onMobileClose} onAnyNavigate={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
