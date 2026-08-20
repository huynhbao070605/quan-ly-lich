"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import {
  passwordResetSchema,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

export type AuthActionResult = {
  ok: boolean;
  message: string;
};

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function getCallbackUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured");
  }

  return new URL("/auth/callback", appUrl).toString();
}

function getPasswordRecoveryCallbackUrl() {
  const callbackUrl = new URL(getCallbackUrl());
  callbackUrl.searchParams.set("type", "recovery");
  return callbackUrl.toString();
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
      emailRedirectTo: getCallbackUrl(),
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
      redirectTo: getCallbackUrl(),
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
    redirectTo: getPasswordRecoveryCallbackUrl(),
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

export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  const parsed = passwordUpdateSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Mật khẩu mới phải có từ 8 đến 128 ký tự.",
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật mật khẩu. Vui lòng thử lại sau.",
    };
  }

  return {
    ok: true,
    message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập.",
  };
}
