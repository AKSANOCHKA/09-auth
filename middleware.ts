import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { serverApi } from "./lib/api/serverApi";

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

  // ✅ Якщо користувач уже авторизований і заходить на /sign-in або /sign-up → редірект у профіль
  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/profile";
    return NextResponse.redirect(destination);
  }

  // ✅ Якщо користувач не має accessToken, але має refreshToken — пробуємо оновити сесію
  if (!accessToken && refreshToken) {
    try {
      const apiRes = await serverApi.get("auth/session", {
        headers: { Cookie: request.headers.get("cookie") || "" },
      });

      if (apiRes.data?.success) {
        // створюємо нову відповідь, щоб оновити куки
        const response = NextResponse.next();
        const setCookie = apiRes.headers["set-cookie"];

        if (setCookie) {
          setCookie.forEach((cookieStr: string) => {
            const [nameValue] = cookieStr.split(";");
            const [name, value] = nameValue.split("=");
            response.cookies.set(name.trim(), value);
          });
        }

        return response;
      }
    } catch {
      // якщо оновити сесію не вдалось — видаляємо старі токени
      const response = NextResponse.redirect(new URL("/sign-in", request.url));
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
      return response;
    }
  }

  // ✅ Якщо користувач неавторизований і намагається потрапити в захищену зону — редірект на /sign-in
  if (!accessToken && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Інакше — пускаємо далі
  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/notes/:path*", "/sign-in", "/sign-up"],
};
