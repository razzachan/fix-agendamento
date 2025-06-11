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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
      <ClientFooter />
    </div>
  );
}
