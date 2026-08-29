import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const isPasswordRecovery = requestUrl.searchParams.get("type") === "recovery";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(new URL("/dat-lai-mat-khau", requestUrl.origin));
      }

      return NextResponse.redirect(new URL("/app/tong-quan", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/dang-nhap", requestUrl.origin));
}
