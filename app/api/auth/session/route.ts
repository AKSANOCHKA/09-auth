import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "../../api";
import { isAxiosError } from "axios";
import { logErrorResponse } from "../../_utils/utils";

export async function GET() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;

    // ✅ Якщо вже є accessToken — не робимо запит до API
    if (accessToken) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ✅ Якщо немає жодного токена
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ success: false }, { status: 200 });
    }

    // ✅ Якщо є refreshToken — пробуємо оновити сесію через API
    const apiRes = await api.get("auth/session", {
      headers: {
        Cookie: cookieStore.toString(),
      },
    });

    // ✅ Якщо API повернув нові куки — оновлюємо їх у відповіді
    const setCookie = apiRes.headers["set-cookie"];
    if (setCookie) {
      setCookie.forEach((cookieStr: string) => {
        const [nameValue] = cookieStr.split(";");
        const [name, value] = nameValue.split("=");
        cookieStore.set(name.trim(), value);
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (isAxiosError(error)) {
      logErrorResponse(error.response?.data);
    } else {
      logErrorResponse({ message: (error as Error).message });
    }

    return NextResponse.json({ success: false }, { status: 200 });
  }
}

