"use client";

import { useActionState } from "react";
import { useTheme } from "next-themes";

import { updateAppearance } from "@/actions/settings-actions";
import type { AppearanceTheme, SettingsActionResult } from "@/actions/settings-actions";

type AppearanceFormProps = {
  initialTheme: AppearanceTheme;
};

const initialState: SettingsActionResult = { ok: false, message: "" };

const themes: Array<{ label: string; value: AppearanceTheme }> = [
  { label: "Sáng", value: "light" },
  { label: "Tối", value: "dark" },
  { label: "Theo hệ thống", value: "system" },
];

export function AppearanceForm({ initialTheme }: AppearanceFormProps) {
  const { setTheme } = useTheme();
  const [state, formAction, isPending] = useActionState<SettingsActionResult, FormData>(
    async (_previousState, formData) =>
      updateAppearance({ theme: String(formData.get("theme") ?? "") as AppearanceTheme }),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Chế độ hiển thị</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {themes.map(({ label, value }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-300 px-3 py-3 text-sm font-medium text-slate-800 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50"
            >
              <input
                name="theme"
                type="radio"
                value={value}
                defaultChecked={initialTheme === value}
                onChange={() => setTheme(value)}
                className="size-4 accent-emerald-700"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Lưu giao diện
      </button>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
