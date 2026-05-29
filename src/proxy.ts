// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decodes a JWT token payload on the Edge runtime without external dependencies.
 */
function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPrivateRoute =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/schedule-export');

  // If trying to access private route and no tokens are present
  if (isPrivateRoute && !accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If trying to access login/register while authenticated
  if (isAuthRoute && (accessToken || refreshToken)) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Protect admin routes: Verify permissions on the server-side middleware
  if (pathname.startsWith('/admin')) {
    if (accessToken) {
      const payload = decodeJwt(accessToken);
      if (payload) {
        const roles = payload.roles || [];
        const permissions = payload.permissions || [];
        
        // Super admin bypass, or has any of the admin section permissions
        const hasAdminAccess =
          roles.includes('ADMIN') ||
          permissions.includes('manage:all') ||
          permissions.includes('read:dashboard') ||
          permissions.includes('read:users') ||
          permissions.includes('read:roles') ||
          permissions.includes('read:sports');

        if (!hasAdminAccess) {
          const homeUrl = new URL('/', request.url);
          return NextResponse.redirect(homeUrl);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static assets, favicon, etc.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
