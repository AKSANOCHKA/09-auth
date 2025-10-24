import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "../../api";
import { isAxiosError } from "axios";
import { logErrorResponse } from "../../_utils/utils";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;

    // Якщо є accessToken — просто повертаємо успіх
    if (accessToken) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Якщо немає жодного токена — сесія неактивна
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    // Якщо є refreshToken — пробуємо оновити сесію через бекенд
    const apiRes = await api.get("/auth/session", {
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    const response = NextResponse.json({ success: true }, { status: 200 });

    const setCookie = apiRes.headers["set-cookie"];
    if (setCookie) {
      setCookie.forEach((cookieStr: string) => {
        const parts = cookieStr.split(";").map((part) => part.trim());
        const [name, value] = parts[0].split("=");

        interface CookieOptions {
          path?: string;
          expires?: Date;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: true | false | "lax" | "strict" | "none";
          maxAge?: number;
        }

        const cookieOptions: CookieOptions = {};

        parts.slice(1).forEach((attr) => {
          const [key, val] = attr.split("=");
          const lowerKey = key.toLowerCase();

          if (lowerKey === "path") cookieOptions.path = val || "/";
          else if (lowerKey === "expires") {
            const date = new Date(val);
            if (!isNaN(date.getTime())) cookieOptions.expires = date;
          } else if (lowerKey === "httponly") cookieOptions.httpOnly = true;
          else if (lowerKey === "secure") cookieOptions.secure = true;
          else if (lowerKey === "samesite") {
            // ✅ нормалізуємо значення
            const normalized =
              val?.toLowerCase() === "lax"
                ? "lax"
                : val?.toLowerCase() === "strict"
                  ? "strict"
                  : val?.toLowerCase() === "none"
                    ? "none"
                    : true; // іноді бекенд відправляє SameSite без значення → true
            cookieOptions.sameSite = normalized;
          } else if (lowerKey === "max-age") cookieOptions.maxAge = Number(val);
        });

        response.cookies.set({
          name: name.trim(),
          value: value.trim(),
          ...cookieOptions,
        });
      });
    }

    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      logErrorResponse(error.response?.data);
    } else {
      logErrorResponse({ message: (error as Error).message });
    }

    return NextResponse.json({ success: false }, { status: 200 });
  }
}
