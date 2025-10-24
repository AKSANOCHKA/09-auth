import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PAGES = ["/sign-in", "/sign-up"];
const PROTECTED_PREFIXES = ["/profile", "/notes"];

const isAuthPage = (pathname: string) => AUTH_PAGES.includes(pathname);
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  // ✅ Якщо є accessToken і користувач відкриває /sign-in або /sign-up → редирект у профіль
  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/profile";
    return NextResponse.redirect(destination);
  }

  // ✅ Якщо accessToken немає, але є refreshToken — пробуємо оновити сесію
  if (!accessToken && refreshToken) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`,
        {
          method: "GET",
          headers: {
            Cookie: `refreshToken=${refreshToken}`,
          },
        }
      );
      const data = await res.json();

      // Якщо бекенд підтвердив сесію — дозволяємо доступ
      if (data.success) {
        return NextResponse.next();
      }
    } catch {
      // Ігноруємо, якщо оновити не вдалося
    }
  }

  // ✅ Якщо користувач неавторизований і відкриває приватну сторінку — редирект на /sign-in
  if (!accessToken && !refreshToken && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/notes/:path*", "/sign-in", "/sign-up"],
};
