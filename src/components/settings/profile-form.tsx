"use client";

import { useActionState } from "react";

import { updateProfile } from "@/actions/profile-actions";
import type { ProfileActionResult } from "@/actions/profile-actions";

type ProfileFormProps = {
  initialDisplayName: string;
  email: string;
};

const initialState: ProfileActionResult = { ok: false, message: "" };

export function ProfileForm({ initialDisplayName, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ProfileActionResult, FormData>(
    async (_previousState, formData) =>
      updateProfile({ displayName: String(formData.get("displayName") ?? "") }),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-slate-800">
        Tên hiển thị
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          defaultValue={initialDisplayName}
          required
          maxLength={80}
          className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
        />
      </label>
      <label className="block text-sm font-medium text-slate-800">
        Email
        <input
          type="email"
          value={email}
          readOnly
          className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Lưu hồ sơ
      </button>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
