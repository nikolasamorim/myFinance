import React from 'react';
// import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-dvh bg-gray-100 overflow-hidden lg:p-3">
      {/* <Navbar /> */}
      
      <div className="flex gap-3 h-full min-h-0">
        <Sidebar />
        
        <main className="flex-1 min-w-0 min-h-0 bg-white border border-gray-200 rounded-lg lg:ml-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-8 pb-24">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}