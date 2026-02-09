import React from 'react';
// import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden lg:pt-3 lg:pb-3 lg:pr-3">
      {/* <Navbar /> */}
      
      <div className="flex gap-1">
        <Sidebar />
        
        <main className="flex-1 bg-white border border-gray-200 rounded-lg lg:ml-0 min-w-0">
          <div className="p-3 max-h-screen overflow-y-auto sm:p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}