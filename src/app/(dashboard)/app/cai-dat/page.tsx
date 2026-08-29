import { AppearanceForm } from "@/components/settings/appearance-form";
import { AccountForm } from "@/components/settings/account-form";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { TaskDefaultsForm } from "@/components/settings/task-defaults-form";
import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import type { AppearanceTheme, DefaultTaskView } from "@/actions/settings-actions";
import type { TaskPriority } from "@/lib/validation/task";

type SettingsRow = {
  default_priority: TaskPriority;
  default_reminder_offsets_minutes: number[];
  default_task_view: DefaultTaskView;
  notify_due_today: boolean;
  notify_overdue: boolean;
  notify_recurring: boolean;
  notify_reminder: boolean;
  theme: AppearanceTheme;
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const [{ data: profile }, { data: rawSettings }] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("id", user.id).single(),
    supabase
      .from("user_settings")
      .select(
        [
          "theme",
          "default_priority",
          "default_reminder_offsets_minutes",
          "week_start",
          "default_task_view",
          "notify_reminder",
          "notify_due_today",
          "notify_overdue",
          "notify_recurring",
        ].join(", "),
      )
      .eq("user_id", user.id)
      .single(),
  ]);
  const settings = rawSettings as SettingsRow | null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Cài đặt</h1>
        <p className="mt-2 text-sm text-slate-600">
          Quản lý hồ sơ, giao diện và thiết lập mặc định của bạn.
        </p>
      </header>

      <section aria-labelledby="profile-heading" className="border-b border-slate-200 pb-8">
        <h2 id="profile-heading" className="text-lg font-semibold text-slate-950">
          Hồ sơ
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Cập nhật tên hiển thị và xem địa chỉ email.
        </p>
        <div className="mt-5">
          <ProfileForm
            initialDisplayName={profile?.display_name ?? ""}
            email={profile?.email ?? user.email ?? ""}
          />
        </div>
      </section>

      <section aria-labelledby="appearance-heading" className="border-b border-slate-200 pb-8">
        <h2 id="appearance-heading" className="text-lg font-semibold text-slate-950">
          Giao diện
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Chọn chế độ hiển thị bạn muốn sử dụng.
        </p>
        <div className="mt-5">
          <AppearanceForm initialTheme={(settings?.theme ?? "system") as AppearanceTheme} />
        </div>
      </section>

      <section aria-labelledby="task-defaults-heading" className="border-b border-slate-200 pb-8">
        <h2 id="task-defaults-heading" className="text-lg font-semibold text-slate-950">
          Mặc định công việc
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Thiết lập giá trị áp dụng khi tạo công việc mới.
        </p>
        <div className="mt-5">
          <TaskDefaultsForm
            initialDefaultPriority={(settings?.default_priority ?? "MEDIUM") as TaskPriority}
            initialDefaultTaskView={(settings?.default_task_view ?? "list") as DefaultTaskView}
            initialReminderOffsets={settings?.default_reminder_offsets_minutes ?? [1440, 0]}
          />
        </div>
      </section>

      <section aria-labelledby="notification-settings-heading" className="border-b border-slate-200 pb-8">
        <h2 id="notification-settings-heading" className="text-lg font-semibold text-slate-950">
          Thông báo
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Bật hoặc tắt các thông báo trong ứng dụng.
        </p>
        <div className="mt-5">
          <NotificationSettingsForm
            initialNotifyDueToday={settings?.notify_due_today ?? true}
            initialNotifyOverdue={settings?.notify_overdue ?? true}
            initialNotifyRecurring={settings?.notify_recurring ?? true}
            initialNotifyReminder={settings?.notify_reminder ?? true}
          />
        </div>
      </section>

      <section aria-labelledby="account-heading" className="pb-8">
        <h2 id="account-heading" className="text-lg font-semibold text-slate-950">
          Tài khoản
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Đăng xuất hoặc xóa tài khoản hiện tại.
        </p>
        <div className="mt-5">
          <AccountForm />
        </div>
      </section>
    </div>
  );
}
