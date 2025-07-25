import React, { ReactNode } from 'react';
import { ClientHeader } from './ClientHeader';
import { ClientFooter } from './ClientFooter';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      <main className="w-full px-0 py-8 sm:container sm:mx-auto sm:px-4 max-w-6xl">
        {children}
      </main>
      <ClientFooter />
    </div>
  );
}
