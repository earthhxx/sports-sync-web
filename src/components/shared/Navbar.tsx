'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut, User as UserIcon, Shield, Menu } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuthStore();

  const getInitials = () => {
    if (!user) return 'U';
    const first = user.firstName ? user.firstName[0] : '';
    const last = user.lastName ? user.lastName[0] : '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  const isAdmin = user?.roles.includes('ADMIN');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900 transition-colors lg:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
              SPORTS SYNC
            </span>
          </Link>
        </div>

        {/* Right Section */}
        {user && (
          <div className="flex items-center gap-4">
            {/* User Badge */}
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-semibold text-slate-200">
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                {isAdmin ? (
                  <>
                    <Shield className="w-3 h-3 text-teal-400" />
                    Admin Portal
                  </>
                ) : (
                  'Member'
                )}
              </span>
            </div>

            {/* Avatar Dropdown */}
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-teal-500/30 text-teal-400 font-semibold text-sm transition-transform hover:scale-105 cursor-pointer"
            >
              {getInitials()}
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900/60 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
