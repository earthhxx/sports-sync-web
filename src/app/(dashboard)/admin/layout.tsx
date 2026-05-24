'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const isAdmin = user?.roles.includes('ADMIN');

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/');
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-teal-500 animate-bounce" />
          <span className="text-sm font-medium tracking-wide">VERIFYING PRIVILEGES...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
