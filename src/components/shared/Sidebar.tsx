'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Calendar, User, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose,
}) => {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const isAdmin = user?.roles.includes('ADMIN');

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      label: 'Profile Settings',
      href: '/profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  if (isAdmin) {
    navItems.push({
      label: 'Admin Control',
      href: '/admin',
      icon: <ShieldAlert className="w-5 h-5" />,
    });
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-900 text-slate-400">
      {/* Collapse button for Desktop */}
      <div className="hidden lg:flex items-center justify-end p-4 border-b border-slate-900/60">
        <button
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-slate-200 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/10 to-teal-500/0 text-teal-400 border-l-2 border-teal-500 shadow-[inset_4px_0_15px_-4px_rgba(20,184,166,0.2)]'
                  : 'hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className={`transition-opacity duration-300 ${!isOpen && 'lg:hidden'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Context summary */}
      {user && isOpen && (
        <div className="p-4 border-t border-slate-900/60 bg-slate-900/20 lg:block hidden">
          <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Privileges
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 text-[10px] font-medium rounded bg-teal-500/10 text-teal-400 border border-teal-500/20"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Sidebar Slide-out */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop Sidebar Static / Collapsible */}
      <div
        className={`hidden lg:block h-[calc(100vh-4rem)] flex-shrink-0 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-16'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
