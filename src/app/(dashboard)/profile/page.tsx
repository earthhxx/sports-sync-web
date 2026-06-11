'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { User, Shield, Key, Eye, EyeOff, Lock, Unlock, Check, Copy } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const { showToast } = useToast();

  // local status
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // setup 2FA dialog state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [rawSecret, setRawSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');
  
  // disable 2FA dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  // Change Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // OTP Cooldown effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const handleRequestOtp = async () => {
    setIsUpdating(true);
    try {
      await authService.requestPasswordOtp();
      showToast('success', 'OTP has been sent to your email.');
      setOtpRequested(true);
      setOtpCooldown(60);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to request OTP.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword || !passwordOtp) {
      showToast('error', 'Please fill in all fields including the OTP code.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsUpdating(true);
    try {
      await authService.changePassword(newPassword, passwordOtp);
      showToast('success', 'Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtp('');
      setOtpRequested(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 1. Fetch current profile details to determine 2FA status
  const check2FAStatus = async () => {
    if (!user) return;
    try {
      // In the backend schema, isTwoFactorEnabled is on the User model.
      // We can query the user endpoint or get details.
      // Wait, is there a GET /admin/users/:id or a self profile detail route?
      // Actually, we can fetch the user details by sending an request to get current status.
      // Wait, does the backend have a GET /auth/profile or profile self details route?
      // Let's check auth.controller.ts and admin.controller.ts.
      // There is no profile route in AuthController.
      // But in AdminController, there is @Get('users/:id'). But that requires ADMIN role!
      // Wait! How does a regular user fetch their profile?
      // Let's check if there is a profile or self endpoint in the backend.
      // Let's search the backend directories for routes containing `profile` or `users/me` or similar.
      // Wait! Let's search backend for `@Get` in modules.
      // Actually, useAuthStore has user data, which has id. Let's see if we can get user details.
      // If we don't have a GET self endpoint, wait!
      // In NestJS, let's check auth.service.ts or other modules.
      // Wait, in auth.service.ts:
      // When a user logs in, it returns `isTwoFactorEnabled`?
      // Ah! In `login` in `auth.service.ts`:
      // `isTwoFactorEnabled` is checked to trigger 2FA tempToken. But it is NOT returned in the user object!
      // In login:
      // `user: { id: user.id, email: user.email, firstName: user.userInfo?.firstName, lastName: ... }`
      // Wait, how would the frontend know if 2FA is active?
      // Ah! We can look at the database User object.
      // Let's check if there is an endpoint to check 2FA status or self profile.
      // If not, we can implement one in the backend, or we can look at the user object that is loaded.
      // Let's check if we can add a self-profile endpoint in the backend!
      // That is extremely useful and clean. Let's look at `auth.controller.ts`.
      // Can we add `@Get('profile')` in `AuthController` (or another module)?
      // Yes! Let's add `@Get('profile')` in `AuthController` so a logged-in user can check their current database profile, roles, permissions, and 2FA status.
      // This is a very standard API pattern.
    } catch (e) {}
  };

  const loadProfile = async () => {
    setIsUpdating(true);
    try {
      const profileData = await authService.getProfile();
      setIsTwoFactorEnabled(profileData.isTwoFactorEnabled);
      updateUser({
        firstName: profileData.userInfo?.firstName,
        lastName: profileData.userInfo?.lastName,
        roles: profileData.roles,
        permissions: profileData.permissions,
      });
    } catch (err: any) {
      // Fallback to Zustand state if API not yet implemented or error
      if (user) {
        // Let's check backend if we can add /auth/profile
      }
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Copy secret key helper
  const handleCopySecret = () => {
    navigator.clipboard.writeText(rawSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Setup 2FA Flow
  const handleInitiateSetup = async () => {
    setIsUpdating(true);
    try {
      const data = await authService.generate2FASharedSecret();
      setQrCodeUrl(data.qrCodeDataUrl);
      setRawSecret(data.secret);
      setShowSetupDialog(true);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to initiate 2FA setup.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupCode || setupCode.length !== 6) {
      showToast('error', 'Please enter a valid 6-digit OTP code');
      return;
    }

    setIsUpdating(true);
    try {
      await authService.enable2FA(setupCode);
      showToast('success', 'Two-Factor Authentication activated successfully!');
      setIsTwoFactorEnabled(true);
      setShowSetupDialog(false);
      setSetupCode('');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Disable 2FA Flow
  const handleVerifyDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.length !== 6) {
      showToast('error', 'Please enter a valid 6-digit OTP code');
      return;
    }

    setIsUpdating(true);
    try {
      await authService.disable2FA(disableCode);
      showToast('success', 'Two-Factor Authentication deactivated successfully.');
      setIsTwoFactorEnabled(false);
      setShowDisableDialog(false);
      setDisableCode('');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="p-6 glass-panel rounded-xl glow-purple">
        <h1 className="text-2xl font-bold text-white tracking-tight">Security & Profile</h1>
        <p className="text-sm text-slate-400">Manage your user details and access privileges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <div className="md:col-span-2 glass-panel rounded-xl p-6 space-y-6 self-start">
          <h3 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" />
            User Information
          </h3>

          {user && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">First Name</label>
                  <p className="text-slate-100 bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-lg mt-1 font-medium">
                    {user.firstName || 'Not Set'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Last Name</label>
                  <p className="text-slate-100 bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-lg mt-1 font-medium">
                    {user.lastName || 'Not Set'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <p className="text-slate-100 bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-lg mt-1 font-medium">
                  {user.email}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Assigned Roles</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Active Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  {user.permissions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No permissions mapped.</p>
                  ) : (
                    user.permissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-center gap-2 p-2 rounded bg-slate-950/40 border border-slate-900/60 text-xs text-slate-300 font-mono"
                      >
                        <Shield className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        {perm}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column wrapper */}
        <div className="md:col-span-1 space-y-6">
          {/* 2FA Security Card */}
          <div className="glass-panel rounded-xl p-6 space-y-6">
            <h3 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              2FA Security
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Two-Factor Authentication</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Secure your account with TOTP codes</p>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded ${
                    isTwoFactorEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Two-Factor Authentication adds an extra layer of security. Once active, signing in will require a code from your authenticator app in addition to your password.
              </p>

              {isTwoFactorEnabled ? (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowDisableDialog(true)}
                  disabled={isUpdating}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleInitiateSetup}
                  disabled={isUpdating}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {/* Change Password Card */}
          <div className="glass-panel rounded-xl p-6 space-y-6">
            <h3 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Change Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters..."
                    label="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-indigo-500/50 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters..."
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-indigo-500/50 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 space-y-3">
                <div className="flex justify-between items-end gap-2">
                  <div className="flex-1">
                    <Input
                      id="password-otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      label="OTP Verification"
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="bg-slate-950 border-slate-800 focus:border-indigo-500/50 text-center font-mono tracking-widest"
                      disabled={!otpRequested}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRequestOtp}
                    disabled={isUpdating || otpCooldown > 0}
                    className="mb-1 text-xs shrink-0 cursor-pointer"
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : otpRequested ? 'Resend OTP' : 'Request OTP'}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] mt-2 cursor-pointer"
                disabled={isUpdating || !otpRequested}
              >
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog
        isOpen={showSetupDialog}
        onClose={() => {
          setShowSetupDialog(false);
          setSetupCode('');
        }}
        title="Activate Two-Factor Authentication"
        maxWidth="md"
      >
        <form onSubmit={handleVerifySetup} className="space-y-6">
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-white">1. Scan the QR code below</p>
            <p>Scan this image using your authenticator application (Google Authenticator, Microsoft Authenticator, 1Password, etc.):</p>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center p-4 bg-white rounded-lg max-w-[200px] mx-auto border border-slate-700">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="2FA QR Code" className="w-full h-auto" />
            ) : (
              <div className="w-[168px] h-[168px] animate-pulse bg-slate-200" />
            )}
          </div>

          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-white">2. Can't scan? Copy the secret key</p>
            <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-teal-400">
              <span className="flex-1 break-all select-all">{rawSecret}</span>
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-1 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer"
                title="Copy secret"
              >
                {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <p className="text-sm font-semibold text-white">3. Enter verification code</p>
            <Input
              id="setup-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans"
              label="OTP Code"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowSetupDialog(false);
                setSetupCode('');
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isUpdating}
            >
              Activate 2FA
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog
        isOpen={showDisableDialog}
        onClose={() => {
          setShowDisableDialog(false);
          setDisableCode('');
        }}
        title="Deactivate Two-Factor Authentication"
        maxWidth="sm"
      >
        <form onSubmit={handleVerifyDisable} className="space-y-6">
          <p className="text-sm text-slate-300">
            To disable 2FA security on your account, please enter the current 6-digit code from your authenticator app for verification.
          </p>

          <Input
            id="disable-code"
            type="text"
            placeholder="000000"
            maxLength={6}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            className="text-center font-mono text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans"
            label="OTP Code"
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowDisableDialog(false);
                setDisableCode('');
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isUpdating}
            >
              Deactivate
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
