import React from 'react';
import { Users, Building, User } from 'lucide-react';
import type { Workspace } from '../types';

export function getWorkspaceIcon(workspace: Workspace | null | undefined): React.ReactNode {
  if (!workspace) return <User className="w-4 h-4 text-gray-600" />;
  if (workspace.workspace_icon) {
    const isUrl = workspace.workspace_icon.startsWith('http') || workspace.workspace_icon.startsWith('/');
    if (isUrl) return <img src={workspace.workspace_icon} alt="workspace" className="w-full h-full object-cover" />;
    return <span className="text-lg leading-none">{workspace.workspace_icon}</span>;
  }

  switch (workspace.workspace_type) {
    case 'family':
      return <Users className="w-4 h-4 text-gray-600" />;
    case 'business':
      return <Building className="w-4 h-4 text-gray-600" />;
    default:
      return <User className="w-4 h-4 text-gray-600" />;
  }
}
