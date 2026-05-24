'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type VerifyStatus = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Resend form state
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Verify email token on page load
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided. Please check your email link.');
      return;
    }

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setStatus('error');
        setErrorMessage(
          error.response?.data?.message || 'Verification token is invalid or expired.'
        );
      }
    };

    verify();
  }, [token]);

  const handleResend = useCallback(async () => {
    if (!resendEmail || resendCooldown > 0) {
      if (!resendEmail) showToast('error', 'Please enter your email address.');
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerification(resendEmail);
      showToast('success', 'Verification email sent successfully!');
      setResendCooldown(60);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error.response?.data?.message || 'Failed to resend verification email.';
      showToast('error', errMsg);
    } finally {
      setIsResending(false);
    }
  }, [resendEmail, resendCooldown, showToast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Premium Neon glows - Indigo & Violet */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Card Panel using Glassmorphism styled in custom Violet/Indigo aesthetic */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative border border-slate-800/80 bg-slate-950/45 backdrop-blur-xl">
          
          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-6 text-center py-6">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-pulse">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                  Verifying your email...
                </h2>
                <p className="text-sm text-slate-400">
                  Please wait while we verify your email address.
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-6 text-center py-6">
              {/* Checkmark animation inside premium glow sphere */}
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-in zoom-in duration-500 ease-out">
                <svg className="w-12 h-12 text-indigo-400 animate-in zoom-in duration-300 delay-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  EMAIL VERIFIED
                </h2>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Your email has been verified successfully. You can now log in to your account.
                </p>
              </div>

              <div className="w-full mt-4">
                <Link href="/auth/login" className="block">
                  <Button variant="secondary" className="w-full py-3">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Failure animation inside premium red/violet glow sphere */}
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-violet-500/20 border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-in zoom-in spin-in-12 duration-500 ease-out">
                <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 to-violet-400 bg-clip-text text-transparent">
                  VERIFICATION FAILED
                </h2>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>

              {/* Resend Verification Form */}
              <div className="w-full mt-4 bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 shadow-inner">
                <p className="text-xs text-slate-400 text-left mb-3 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Request a new verification link:
                </p>
                <div className="space-y-3">
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="name@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="bg-slate-900 border-slate-800 focus:border-indigo-500/50"
                  />
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider"
                    disabled={resendCooldown > 0 || isResending}
                    isLoading={isResending}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend Verification Link'}
                  </Button>
                </div>
              </div>

              <Link href="/auth/login" className="block w-full mt-2">
                <Button variant="ghost" className="w-full py-3 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500" />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
