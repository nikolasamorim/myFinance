import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X, TrendingUp, TrendingDown, CreditCard, PiggyBank } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function SidebarItem({ to, icon, label, isActive }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function SidebarGroup({ title, children, defaultExpanded = true }: SidebarGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-2">
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
      
      {isExpanded && (
        <div className="space-y-1 pl-2">
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
      icon: <CreditCard className="w-5 h-5 text-orange-600" />,
      label: 'Dívidas',
    },
    {
      to: '/gerenciadores/investimentos',
      icon: <PiggyBank className="w-5 h-5 text-blue-600" />,
      label: 'Investimentos',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
        <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <SidebarGroup title="Gerenciadores">
          {managerItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.to}
            />
          ))}
        </SidebarGroup>
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64">
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