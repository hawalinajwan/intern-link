import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('role')?.value;
  const token = request.cookies.get('token')?.value;
  const isLoggedIn = Boolean(token && role);

  if (pathname.startsWith('/mahasiswa') && role !== 'mahasiswa') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (pathname.startsWith('/hrd') && role !== 'hrd') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (pathname.startsWith('/auth') && isLoggedIn) {
    const target = role === 'hrd' ? '/hrd/dashboard' : '/mahasiswa/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/mahasiswa/:path*', '/hrd/:path*', '/auth/:path*'],
};
