'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, Eye, EyeOff, Mail } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const { showToast } = useToast();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state management
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = await authService.login(formData);

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setRequires2FA(true);
        showToast('info', 'Two-Factor Authentication required. Please enter verification code.');
      } else {
        const { access_token, refresh_token, user } = data;
        login(access_token, refresh_token, user);
        showToast('success', 'Logged in successfully!');
        router.push('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Invalid credentials';
      showToast('error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsLoading(true);
    try {
      // Pass tempToken explicitly in the headers for authentication
      const data = await authService.authenticate2FA(otpCode, tempToken!);
      login(data.access_token, data.refresh_token, data.user);
      showToast('success', 'Authenticated successfully!');
      router.push('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Invalid verification code';
      showToast('error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Neon glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Head */}
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-teal-500/30 text-teal-400">
            {requires2FA ? <Key className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
            {requires2FA ? 'VERIFY OTP' : 'LOGIN TO SPORTS SYNC'}
          </h2>
          <p className="text-sm text-slate-400">
            {requires2FA
              ? 'Enter the 6-digit code from your Authenticator app'
              : 'Sign in to access schedules and match controls'}
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel rounded-xl p-8 shadow-2xl relative">
          {!requires2FA ? (
            // CREDENTIALS LOGIN FORM
            <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
              <Input
                id="email"
                type="email"
                label="Email Address"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleCredentialsChange}
                error={errors.email}
              />

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleCredentialsChange}
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
                Sign In
              </Button>
            </form>
          ) : (
            // 2FA VERIFICATION FORM
            <form className="space-y-6" onSubmit={handleOTPSubmit}>
              <Input
                id="otp"
                type="text"
                label="Verification Code"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, ''));
                  if (errors.otp) setErrors({});
                }}
                error={errors.otp}
                className="text-center text-2xl tracking-[0.5em] font-mono placeholder:tracking-normal placeholder:font-sans"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 py-3"
                  onClick={() => {
                    setRequires2FA(false);
                    setTempToken(null);
                    setOtpCode('');
                    setErrors({});
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-3"
                  isLoading={isLoading}
                >
                  Verify
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm border-t border-slate-900/60 pt-4">
            <span className="text-slate-400">Don't have an account? </span>
            <Link
              href="/register"
              className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
