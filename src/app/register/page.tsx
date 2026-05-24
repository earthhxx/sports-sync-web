'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Register() {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Post-registration state
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authService.register(formData);
      setRegisteredEmail(formData.email);
      showToast('success', 'Registration successful! Please check your inbox.');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      const errMsg = error.response?.data?.message || 'Registration failed';
      if (error.response?.status === 409) {
        showToast('error', 'This email is already registered and verified. Please try logging in.');
      } else {
        showToast('error', errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = useCallback(async () => {
    if (!registeredEmail || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await authService.resendVerification(registeredEmail);
      showToast('success', 'Verification email sent successfully!');
      setResendCooldown(60);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errMsg = error.response?.data?.message || 'Failed to resend verification email.';
      showToast('error', errMsg);
    } finally {
      setIsResending(false);
    }
  }, [registeredEmail, resendCooldown, showToast]);

  // SUCCESS SCREEN — "Check your email"
  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-3 text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400 animate-in zoom-in duration-500">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
              CHECK YOUR EMAIL
            </h2>
            <p className="text-sm text-slate-400 max-w-xs">
              We&apos;ve sent a verification link to
            </p>
            <p className="text-teal-400 font-semibold text-base break-all">
              {registeredEmail}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Please check your inbox and click the verification link to activate your account. The link will expire in 24 hours.
            </p>
          </div>

          <div className="glass-panel rounded-xl p-8 shadow-2xl">
            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                variant="outline"
                className="w-full py-3"
                disabled={resendCooldown > 0 || isResending}
                isLoading={isResending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </Button>

              <Link href="/login" className="block">
                <Button variant="primary" className="w-full py-3">
                  Go to Login
                </Button>
              </Link>
            </div>

            <p className="text-xs text-slate-500 text-center mt-6">
              Didn&apos;t receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Neon glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Head */}
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-teal-500/30 text-teal-400">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
            CREATE AN ACCOUNT
          </h2>
          <p className="text-sm text-slate-400">
            Join Sports Sync and get matches synchronized
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel rounded-xl p-8 shadow-2xl relative">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="firstName"
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />
              <Input
                id="lastName"
                label="Last Name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
              />
            </div>

            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full py-3"
              isLoading={isLoading}
            >
              Sign Up
            </Button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-slate-900/60 pt-4">
            <span className="text-slate-400">Already have an account? </span>
            <Link
              href="/login"
              className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
