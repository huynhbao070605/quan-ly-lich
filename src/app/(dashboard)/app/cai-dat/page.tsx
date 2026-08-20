import { AppearanceForm } from "@/components/settings/appearance-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import type { AppearanceTheme } from "@/actions/settings-actions";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("id", user.id).single(),
    supabase.from("user_settings").select("theme").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Cài đặt</h1>
        <p className="mt-2 text-sm text-slate-600">Quản lý hồ sơ và giao diện của bạn.</p>
      </header>

      <section aria-labelledby="profile-heading" className="border-b border-slate-200 pb-8">
        <h2 id="profile-heading" className="text-lg font-semibold text-slate-950">
          Hồ sơ
        </h2>
        <p className="mt-1 text-sm text-slate-600">Cập nhật tên hiển thị và xem địa chỉ email.</p>
        <div className="mt-5">
          <ProfileForm
            initialDisplayName={profile?.display_name ?? ""}
            email={profile?.email ?? user.email ?? ""}
          />
        </div>
      </section>

      <section aria-labelledby="appearance-heading" className="pb-8">
        <h2 id="appearance-heading" className="text-lg font-semibold text-slate-950">
          Giao diện
        </h2>
        <p className="mt-1 text-sm text-slate-600">Chọn chế độ hiển thị bạn muốn sử dụng.</p>
        <div className="mt-5">
          <AppearanceForm initialTheme={(settings?.theme ?? "system") as AppearanceTheme} />
        </div>
      </section>
    </div>
  );
}
