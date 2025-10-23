import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionServer } from "./lib/api/serverApi";

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

  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/profile";
    return NextResponse.redirect(destination);
  }

  if (!accessToken && refreshToken) {
    try {
      const apiRes = await getSessionServer();

      if (apiRes.data?.success) {
        const response = NextResponse.next();

        // Ось правильний доступ до заголовку set-cookie в Axios
        const setCookie = apiRes.headers["set-cookie"];

        if (setCookie) {
          // setCookie може бути рядком або масивом рядків
          const cookiesArr = Array.isArray(setCookie) ? setCookie : [setCookie];

          cookiesArr.forEach((cookieStr: string) => {
            const [nameValue] = cookieStr.split(";");
            const [name, value] = nameValue.split("=");
            if (name && value) {
              response.cookies.set(name.trim(), value);
            }
          });
        }

        return response;
      }
    } catch {
      const response = NextResponse.redirect(new URL("/sign-in", request.url));
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
      return response;
    }
  }

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
