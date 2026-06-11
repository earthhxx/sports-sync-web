import { api } from '@/lib/axios';

export const authService = {
  // Login standard credentials
  async login(formData: Record<string, string>) {
    const response = await api.post('/auth/login', formData);
    return response.data;
  },

  // Register a new account
  async register(formData: Record<string, string>) {
    const response = await api.post('/auth/register', formData);
    return response.data;
  },

  // Verify 2FA OTP code on login with a temp token
  async authenticate2FA(code: string, tempToken: string) {
    const response = await api.post(
      '/auth/2fa/authenticate',
      { code },
      {
        headers: {
          Authorization: `Bearer ${tempToken}`,
        },
      }
    );
    return response.data;
  },

  // Get current user profile details
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Generate 2FA secret key and QR code
  async generate2FASharedSecret() {
    const response = await api.post('/auth/2fa/generate');
    return response.data;
  },

  // Activate 2FA using verified code
  async enable2FA(code: string) {
    const response = await api.post('/auth/2fa/turn-on', { code });
    return response.data;
  },

  // Deactivate 2FA using verified code
  async disable2FA(code: string) {
    const response = await api.post('/auth/2fa/turn-off', { code });
    return response.data;
  },

  // Verify email using JWT verification token
  async verifyEmail(token: string) {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  // Resend verification email
  async resendVerification(email: string) {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Request OTP for password change
  async requestPasswordOtp() {
    const response = await api.post('/auth/password/request-otp');
    return response.data;
  },

  // Change password using OTP
  async changePassword(passwordStr: string, otpStr: string) {
    const response = await api.post('/auth/password/change', {
      password: passwordStr,
      otp: otpStr,
    });
    return response.data;
  },
};
