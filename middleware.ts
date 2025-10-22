import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshSession } from '@/lib/api/serverApi';

const AUTH_PAGES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/profile', '/notes'];

const isAuthPage = (pathname: string) => AUTH_PAGES.includes(pathname);
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // 🔐 Якщо користувач автентифікований і заходить на сторінку входу — редирект на /profile
  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/profile';
    return NextResponse.redirect(destination);
  }

  // 🔒 Якщо користувач не має accessToken і намагається потрапити на захищену сторінку
  if (!accessToken && isProtectedPath(pathname)) {
    if (refreshToken) {
      try {
        // 🔄 Спроба оновити сесію
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshSession(refreshToken);

        const response = NextResponse.next();

        // ✅ Встановлення оновлених токенів у куки
        response.cookies.set('accessToken', newAccessToken, {
          httpOnly: true,
          secure: true,
          path: '/',
          maxAge: 60 * 15, // 15 хвилин
        });

        response.cookies.set('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 днів
        });

        return response;
      } catch (error) {
        // ❌ refreshToken недійсний або помилка — редирект на /sign-in
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/sign-in';
        redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // ❌ Немає accessToken і refreshToken — редирект на /sign-in
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Усі інші випадки — пропускаємо запит далі
  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/notes/:path*', '/sign-in', '/sign-up'],
};
