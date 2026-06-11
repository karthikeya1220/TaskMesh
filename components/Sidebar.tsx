'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: 'dashboard', label: 'Dashboard' },
    { href: '/jobs', icon: 'work', label: 'Jobs' },
    { href: '/workers', icon: 'engineering', label: 'Workers' },
    { href: '/queue', icon: 'reorder', label: 'Queue' },
    { href: '/executions', icon: 'play_circle', label: 'Executions' },
    { href: '/monitoring', icon: 'monitor_heart', label: 'Monitoring' },
    { href: '/analytics', icon: 'analytics', label: 'Analytics' },
    { href: '/settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <aside className="w-sidebar_width h-screen sticky top-0 left-0 bg-surface-container border-r border-outline-variant flex flex-col p-4 z-50">
      <div className="mb-8 px-2">
        <h1 className="font-h1 text-h1 font-bold text-primary">JobFlow</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant opacity-70">v2.4.0-stable</p>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-secondary-container text-on-secondary-container font-semibold' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" data-icon={link.icon}>{link.icon}</span>
              <span className="font-body-md text-body-md">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-outline-variant pt-4 space-y-1">
        <Link href="/docs" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors duration-200">
          <span className="material-symbols-outlined" data-icon="description">description</span>
          <span className="font-body-md text-body-md">Docs</span>
        </Link>
        <Link href="/support" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors duration-200">
          <span className="material-symbols-outlined" data-icon="help">help</span>
          <span className="font-body-md text-body-md">Support</span>
        </Link>
      </div>
    </aside>
  );
}
