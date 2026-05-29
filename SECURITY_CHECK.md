# Backend Security Checklist

Please analyze the backend code and verify the following security configurations:

## 1. Cookie Security
- [ ] `HttpOnly: true` - Prevents JavaScript from accessing cookies
- [ ] `Secure: true` - Cookies sent only over HTTPS
- [ ] `SameSite: 'Strict'` or `'Lax'` - Prevents CSRF attacks
- [ ] Appropriate `maxAge` or `expires` for tokens

## 2. CORS Configuration
- [ ] `Access-Control-Allow-Origin`: Specific domain (NOT `*`)
- [ ] `Access-Control-Allow-Credentials: true` (if using cookies)
- [ ] `Access-Control-Allow-Methods`: Only needed methods (GET, POST, etc.)
- [ ] `Access-Control-Allow-Headers`: Restricted to necessary headers

## 3. Authentication & Tokens
- [ ] Access token expiry: 15-30 minutes
- [ ] Refresh token expiry: 7 days or more
- [ ] Token validation on every protected request
- [ ] Token revocation/blacklist mechanism

## 4. Input Validation
- [ ] Validate all request inputs (email, password, etc.)
- [ ] Sanitize inputs to prevent SQL Injection
- [ ] Sanitize inputs to prevent XSS attacks
- [ ] Check request size limits

## 5. Rate Limiting
- [ ] Rate limiting on login endpoint (prevent brute force)
- [ ] Rate limiting on password reset (prevent spam)
- [ ] Rate limiting on general endpoints (prevent abuse)

## 6. HTTPS & Security
- [ ] All endpoints require HTTPS
- [ ] HSTS headers configured (Strict-Transport-Security)
- [ ] No sensitive data in URLs/query params

## 7. Error Handling
- [ ] Don't expose stack traces in production
- [ ] Don't reveal user existence (generic error messages)
- [ ] Log security events (failed logins, etc.)

## 8. 2FA Security (if implemented)
- [ ] Temp token expires quickly (5-15 minutes)
- [ ] OTP code expires after correct attempt
- [ ] Rate limiting on OTP verification

---

**Instructions for Agent**: 
Examine the backend repository and create a detailed report on which items above are implemented, which are missing, and provide specific code examples/recommendations for each.
