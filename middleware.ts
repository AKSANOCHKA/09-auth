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

  // Якщо користувач уже авторизований — не пускаємо на /sign-in /sign-up
  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/profile";
    return NextResponse.redirect(destination);
  }

  // Якщо токена немає і маршрут захищений — редирект на /sign-in
  if (!accessToken && isProtectedPath(pathname)) {
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
