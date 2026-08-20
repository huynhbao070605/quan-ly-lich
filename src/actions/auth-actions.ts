"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  passwordResetSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

type AuthActionResult = {
  ok: boolean;
  message: string;
};

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function getCallbackUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}/auth/callback` : undefined;
}

export async function signUpWithEmail(formData: FormData): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.displayName },
    },
  });

  if (error) {
    return {
      ok: false,
      message: "Không thể đăng ký. Vui lòng thử lại sau.",
    };
  }

  return {
    ok: true,
    message: "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
  };
}

export async function signInWithEmail(formData: FormData): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      ok: false,
      message: "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.",
    };
  }

  redirect("/app/tong-quan");
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await getCallbackUrl(),
    },
  });

  if (error || !data.url) {
    return {
      ok: false,
      message: "Không thể đăng nhập bằng Google. Vui lòng thử lại sau.",
    };
  }

  redirect(data.url);
}

export async function signOut(): Promise<AuthActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      message: "Không thể đăng xuất. Vui lòng thử lại sau.",
    };
  }

  redirect("/dang-nhap");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = passwordResetSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Vui lòng nhập địa chỉ email hợp lệ.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await getCallbackUrl(),
  });

  if (error) {
    return {
      ok: false,
      message: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.",
    };
  }

  return {
    ok: true,
    message: "Email đặt lại mật khẩu đã được gửi.",
  };
}
