'use client';

import { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Header, Sidebar, MobileNav } from '@/components/layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Desktop Sidebar - full height, leftmost column */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Right column: header on top, content below */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />

          <main className="flex-1 pb-20 lg:pb-0">
            <div className="max-w-7xl mx-auto w-full p-6 lg:p-8">
              <Suspense fallback={null}>{children}</Suspense>
            </div>
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
