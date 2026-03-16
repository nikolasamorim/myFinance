import React from 'react';
// import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

import { SidebarToggleButton } from '../ui/SidebarToggleButton';


export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="h-dvh bg-bg-surface overflow-hidden lg:p-3">
      {/* <Navbar /> */}

      <div className="block bg-bg-surface rounded-lg shadow-lg lg:hidden fixed left-5 bottom-5 z-50">
          <SidebarToggleButton onMobileToggle={() => setMobileOpen(true)} />
        </div>

      <div className="flex gap-3 h-full min-h-0">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        <main className="flex-1 min-w-0 min-h-0 bg-bg-page border border-border rounded-lg lg:ml-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-8 pb-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
