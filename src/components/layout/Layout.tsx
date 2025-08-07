import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 lg:ml-0 min-w-0">
          <div className="p-3 sm:p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}