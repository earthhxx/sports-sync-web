import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPrivateRoute = pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/admin');

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

  return NextResponse.next();
}

export const config = {
  // Run proxy on all paths except static assets, favicon, etc.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
