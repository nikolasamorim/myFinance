import React from 'react';
import { Users, Building, User } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from './utils';
import type { Workspace } from '../types';

export function isWorkspacePhotoUrl(icon?: string | null): boolean {
  return !!icon && (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:'));
}

// ─── Size presets ──────────────────────────────────────────────────────────────

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE = {
  xs: { wrapper: 'w-5 h-5 rounded',    icon: 'w-3 h-3'   },
  sm: { wrapper: 'w-6 h-6 rounded-md', icon: 'w-3.5 h-3.5' },
  md: { wrapper: 'w-7 h-7 rounded-lg', icon: 'w-4 h-4'   },
  lg: { wrapper: 'w-16 h-16 rounded-xl', icon: 'w-8 h-8' },
} as const;

// ─── WorkspaceAvatar ───────────────────────────────────────────────────────────

interface WorkspaceAvatarProps {
  workspace: Workspace | null | undefined;
  size?: AvatarSize;
  className?: string;
}

/**
 * Renders the workspace visual identity:
 *   photo (URL) → image fills the container
 *   icon name   → lucide icon on colored/default background
 *   default     → type-based icon (User / Users / Building) on default background
 *
 * Background color comes from `workspace_color`. Without a color, falls back to
 * `bg-bg-elevated` so existing layouts are unchanged.
 */
export function WorkspaceAvatar({ workspace, size = 'sm', className }: WorkspaceAvatarProps) {
  const { wrapper, icon: iconCls } = SIZE[size];
  const savedIcon  = workspace?.workspace_icon;
  const color      = workspace?.workspace_color;
  const isPhoto    = isWorkspacePhotoUrl(savedIcon);

  // Photo: ignore color, just render the image
  if (isPhoto) {
    return (
      <span className={cn(wrapper, 'flex-shrink-0 flex items-center justify-center overflow-hidden', className)}>
        <img src={savedIcon!} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  // Icon/default: apply color as background if set, otherwise bg-bg-elevated
  const wrapperClass = cn(
    wrapper,
    'flex-shrink-0 flex items-center justify-center overflow-hidden',
    !color && 'bg-bg-elevated',
    className
  );
  const wrapperStyle = color ? { backgroundColor: color } : undefined;
  const iconColor    = color ? 'text-white' : 'text-text-secondary';

  // Try to resolve a lucide icon name
  const IconCmp = savedIcon
    ? (LucideIcons[savedIcon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }> | undefined)
    : undefined;

  let content: React.ReactNode;
  if (IconCmp) {
    content = <IconCmp className={cn(iconCls, iconColor)} />;
  } else if (savedIcon) {
    // emoji / arbitrary text fallback
    content = <span className={cn('leading-none text-sm', color && 'text-white')}>{savedIcon}</span>;
  } else {
    content = <DefaultTypeIcon workspace={workspace} cls={iconCls} color={iconColor} />;
  }

  return (
    <span className={wrapperClass} style={wrapperStyle}>
      {content}
    </span>
  );
}

function DefaultTypeIcon({
  workspace,
  cls,
  color,
}: {
  workspace: Workspace | null | undefined;
  cls: string;
  color: string;
}) {
  switch (workspace?.workspace_type) {
    case 'family':   return <Users    className={cn(cls, color)} />;
    case 'business': return <Building className={cn(cls, color)} />;
    default:         return <User     className={cn(cls, color)} />;
  }
}

// ─── Legacy helper (kept for backward compat) ─────────────────────────────────

/** @deprecated Use <WorkspaceAvatar> instead. */
export function getWorkspaceIcon(workspace: Workspace | null | undefined): React.ReactNode {
  if (!workspace) return <User className="w-4 h-4 text-text-secondary" />;

  if (workspace.workspace_icon) {
    if (isWorkspacePhotoUrl(workspace.workspace_icon)) {
      return <img src={workspace.workspace_icon} alt="workspace" className="w-full h-full object-cover" />;
    }
    const IconCmp = LucideIcons[workspace.workspace_icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }> | undefined;
    if (IconCmp) return <IconCmp className="w-5 h-5 text-text-secondary" />;
    return <span className="text-lg leading-none">{workspace.workspace_icon}</span>;
  }

  switch (workspace.workspace_type) {
    case 'family':   return <Users    className="w-4 h-4 text-text-secondary" />;
    case 'business': return <Building className="w-4 h-4 text-text-secondary" />;
    default:         return <User     className="w-4 h-4 text-text-secondary" />;
  }
}
