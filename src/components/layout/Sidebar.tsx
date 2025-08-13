import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Building, Wallet, FolderOpen, Tag, Target, CreditCard, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../context/SidebarContext';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function SidebarItem({ to, icon, label, isActive, isCollapsed }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        isCollapsed ? 'justify-center' : 'space-x-3',
        isActive
          ? 'bg-blue-100 text-blue-700 border-1 border-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isCollapsed?: boolean;
}

function SidebarGroup({ title, children, defaultExpanded = true, isCollapsed }: SidebarGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Always show content when collapsed (icon-only mode)
  const shouldShowContent = isCollapsed || isExpanded;

  return (
    <div className="space-y-2">
      {!isCollapsed && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        >
          <span>{title}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}
      
      {shouldShowContent && (
        <div className={cn(
          'space-y-1 transition-all duration-200',
          isCollapsed ? 'pl-0' : 'pl-2'
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarContent({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { isCollapsed } = useSidebar();

  const managerItems = [
    {
      to: '/gerenciadores/receitas',
      icon: <TrendingUp className="w-5 h-5 text-green-600" />,
      label: 'Receitas',
    },
    {
      to: '/gerenciadores/despesas',
      icon: <TrendingDown className="w-5 h-5 text-red-600" />,
      label: 'Despesas',
    },
    {
      to: '/gerenciadores/dividas',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      label: 'Dívidas',
    },
    {
      to: '/gerenciadores/investimentos',
      icon: <PiggyBank className="w-5 h-5 text-blue-600" />,
      label: 'Investimentos',
    },
  ];

  const organizadorItems = [
    // {
    //   to: '/organizadores/instituicoes',
    //   icon: <Building className="w-5 h-5 text-blue-600" />,
    //   label: 'Instituições',
    // },
    {
      to: '/organizadores/contas',
      icon: <Wallet className="w-5 h-5 text-green-600" />,
      label: 'Caixa / Conta',
    },
    {
      to: '/organizadores/cartoes',
      icon: <CreditCard className="w-5 h-5 text-purple-600" />,
      label: 'Cartões de Crédito',
    },
    {
      to: '/organizadores/categorias',
      icon: <Tag className="w-5 h-5 text-yellow-600" />,
      label: 'Categoria',
    },
    {
      to: '/organizadores/centros-de-custo',
      icon: <Target className="w-5 h-5 text-indigo-600" />,
      label: 'Centro de Custo',
    },
  ];

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Mobile Header */}
      <div className={cn(
        'flex items-center border-b border-gray-200 lg:hidden',
        isCollapsed ? 'justify-center p-2' : 'justify-between p-4'
      )}>
        {!isCollapsed && <h2 className="text-lg font-semibold text-gray-900">Menu</h2>}
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-6 overflow-y-auto', isCollapsed ? 'p-2' : 'p-4')}>
        {/* Dashboard - No grouping */}
        <div className="space-y-1">
          <SidebarItem
            to="/dashboard"
            icon={<LayoutDashboard className="w-5 h-5 text-blue-600" />}
            label="Dashboard"
            isActive={location.pathname === '/dashboard'}
            isCollapsed={isCollapsed}
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
            />
          ))}
        </SidebarGroup>
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isCollapsed } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className={cn('transition-all duration-300', isCollapsed ? 'w-16' : 'w-64')}>
          <SidebarContent isOpen={true} onClose={() => {}} />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 max-w-xs">
            <SidebarContent
              isOpen={isMobileOpen}
              onClose={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}