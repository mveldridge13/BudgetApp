'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import {
  FileText,
  Shapes,
  Trophy,
  Settings as SettingsIcon,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';

// Primary destinations shown directly in the bottom bar. Everything else in
// the desktop sidebar (which is hidden on mobile) lives in the "More" sheet.
const primaryItems = [
  { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { id: 'transactions', name: 'Transactions', href: '/transactions', icon: 'transactions' },
  { id: 'goals', name: 'Goals', href: '/goals', icon: 'goals' },
  { id: 'analytics', name: 'Analytics', href: '/analytics', icon: 'analytics' },
];

const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  transactions: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),
  goals: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    </svg>
  ),
  analytics: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
};

interface MoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export default function MobileNav() {
  const pathname = usePathname();
  const { settings } = useAppSettings();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // Mirrors the desktop sidebar's Workspace / Modules / secondary sections.
  const moreItems: MoreItem[] = [
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Categories', href: '/categories', icon: Shapes },
    ...(settings.modules.pokerTracker
      ? [{ name: 'Poker', href: '/poker', icon: Trophy }]
      : []),
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
    { name: 'Help', href: '/docs', icon: HelpCircle },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  const moreActive = moreItems.some((item) => isActive(item.href));

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [moreOpen]);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around items-center py-2">
          {primaryItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center px-3 py-2 ${
                isActive(item.href) ? 'text-indigo-500' : 'text-gray-500'
              }`}
            >
              {icons[item.icon]}
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className={`flex flex-col items-center px-3 py-2 ${
              moreActive ? 'text-indigo-500' : 'text-gray-500'
            }`}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* "More" sheet — the rest of the sidebar destinations. */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-base font-semibold text-gray-900">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-2 pb-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
