'use client';

import React, { useEffect } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { useAuthStore } from '@/store/useAuthStore';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-teal-500" />
          <span className="text-sm font-semibold tracking-wider bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent animate-pulse">
            LOADING SESSION...
          </span>
        </div>
      </div>
    );
  }

  return <ToastProvider>{children}</ToastProvider>;
};
