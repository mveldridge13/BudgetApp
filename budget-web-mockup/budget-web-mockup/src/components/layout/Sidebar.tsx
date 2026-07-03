'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: ReactNode;
}

const menuItems = [
  {
    id: 'overview',
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'transactions',
    name: 'Transactions',
    href: '/transactions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'goals',
    name: 'Goals',
    href: '/goals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
  {
    id: 'analytics',
    name: 'Analytics',
    href: '/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'invoices',
    name: 'Invoices',
    href: '/invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
];

// Grouped under a "Workspace" header — this is where you set up the building
// blocks (categories) that the rest of the app uses.
const workspaceItems = [
  {
    id: 'categories',
    name: 'Categories',
    href: '/categories',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
];

const secondaryItems = [
  {
    id: 'settings',
    name: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: 'help',
    name: 'Help',
    href: '/docs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'feedback',
    name: 'Feedback',
    href: '/feedback',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { settings } = useAppSettings();
  const [collapsed, setCollapsed] = useState(false);

  // Optional feature modules — only shown when toggled on in
  // Settings → Additional Modules. Each enabled module appears under a
  // "Modules" header (the header itself is hidden when none are enabled).
  const moduleItems: NavItem[] = [];
  if (settings.modules.pokerTracker) {
    moduleItems.push({
      id: 'poker',
      name: 'Poker',
      href: '/poker',
      icon: (
        // Ionicons `trophy` (filled) — matches the module icon in Settings.
        <svg className="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
          <path d="M464,80H403.9a4,4,0,0,1-4-4c0-4.89,0-9,0-12.08A32,32,0,0,0,367.9,32h0l-223.79.26a32,32,0,0,0-31.94,31.93c0,3.23,0,7.22,0,11.81a4,4,0,0,1-4,4H48A16,16,0,0,0,32,96v16c0,54.53,30,112.45,76.52,125.35a7.82,7.82,0,0,1,5.55,5.9c5.77,26.89,23.52,52.5,51.41,73.61,20.91,15.83,45.85,27.5,68.27,32.48a8,8,0,0,1,6.25,7.8V444a4,4,0,0,1-4,4H176.45c-8.61,0-16,6.62-16.43,15.23A16,16,0,0,0,176,480H335.55c8.61,0,16-6.62,16.43-15.23A16,16,0,0,0,336,448H276a4,4,0,0,1-4-4V357.14a8,8,0,0,1,6.25-7.8c22.42-5,47.36-16.65,68.27-32.48,27.89-21.11,45.64-46.72,51.41-73.61a7.82,7.82,0,0,1,5.55-5.9C450,224.45,480,166.53,480,112V96A16,16,0,0,0,464,80ZM112,198.22a4,4,0,0,1-6,3.45c-10.26-6.11-17.75-15.37-22.14-21.89-11.91-17.69-19-40.67-19.79-63.63a4,4,0,0,1,4-4.15h40a4,4,0,0,1,4,4C112.05,143.45,112,174.87,112,198.22Zm316.13-18.44c-4.39,6.52-11.87,15.78-22.13,21.89a4,4,0,0,1-6-3.46c0-26.51,0-56.63-.05-82.21a4,4,0,0,1,4-4h40a4,4,0,0,1,4,4.15C447.16,139.11,440.05,162.09,428.14,179.78Z" />
        </svg>
      ),
    });
  }

  // Restore the user's preference (persisted across navigations/sessions).
  useEffect(() => {
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.id}
      href={item.href}
      title={collapsed ? item.name : undefined}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive(item.href) ? 'text-white' : 'text-white text-opacity-80'
      }`}
      style={isActive(item.href) ? { backgroundColor: '#7c7ff5' } : {}}
      onMouseEnter={(e) => {
        if (!isActive(item.href)) {
          e.currentTarget.style.backgroundColor = '#5b5fc7';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive(item.href)) {
          e.currentTarget.style.backgroundColor = '';
        }
      }}
    >
      {item.icon}
      {!collapsed && <span>{item.name}</span>}
    </Link>
  );

  // Section label above a group of nav items. Collapses to a thin divider so
  // the grouping is still visible when the sidebar is narrow.
  const sectionHeader = (label: string) =>
    collapsed ? (
      <div className="my-2 mx-3 border-t border-white border-opacity-20" />
    ) : (
      <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-white text-opacity-50">
        {label}
      </p>
    );

  const collapseToggle = (
    <button
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="p-1 rounded-lg text-white text-opacity-80 transition-colors shrink-0"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#5b5fc7';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
      }}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 flex flex-col transition-[width] duration-200 ease-in-out`}
      style={{ backgroundColor: '#6366f1' }}
    >
      {/* Brand + collapse toggle. h-20 matches the Header so the bottom border
          lines up into one continuous divider across the top of the app. */}
      <div className={`flex items-center h-20 border-b border-gray-400 ${collapsed ? 'justify-center gap-1 px-2' : 'justify-between px-4'}`}>
        <Link href="/dashboard" className="flex items-center gap-2.5" title="Trend">
          <span className={`flex items-center justify-center ${collapsed ? 'w-8 h-8' : 'w-9 h-9'} rounded-lg border border-white border-opacity-30 shrink-0`}>
            <svg className={`${collapsed ? 'w-5 h-5' : 'w-6 h-6'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </span>
          {!collapsed && <span className="text-2xl font-bold text-white">Trend</span>}
        </Link>

        {collapseToggle}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto px-4 pt-4 pb-6">
        <nav className="space-y-1">
          {menuItems.map(renderNavItem)}

          {sectionHeader('Workspace')}
          {workspaceItems.map(renderNavItem)}

          {moduleItems.length > 0 && (
            <>
              {sectionHeader('Modules')}
              {moduleItems.map(renderNavItem)}
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-400 space-y-1">
          {secondaryItems.map(renderNavItem)}
        </div>
      </div>
    </aside>
  );
}
