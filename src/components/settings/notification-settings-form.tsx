"use client";

import { useState, useTransition } from "react";

import { updateNotificationSettings } from "@/actions/settings-actions";
import type { SettingsActionResult } from "@/actions/settings-actions";

type NotificationSettingsFormProps = {
  initialNotifyDueToday: boolean;
  initialNotifyOverdue: boolean;
  initialNotifyRecurring: boolean;
  initialNotifyReminder: boolean;
};

const initialState: SettingsActionResult = { ok: false, message: "" };

export function NotificationSettingsForm({
  initialNotifyDueToday,
  initialNotifyOverdue,
  initialNotifyRecurring,
  initialNotifyReminder,
}: NotificationSettingsFormProps) {
  const [notifyReminder, setNotifyReminder] = useState(initialNotifyReminder);
  const [notifyDueToday, setNotifyDueToday] = useState(initialNotifyDueToday);
  const [notifyOverdue, setNotifyOverdue] = useState(initialNotifyOverdue);
  const [notifyRecurring, setNotifyRecurring] = useState(initialNotifyRecurring);
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateNotificationSettings({
        notifyReminder,
        notifyDueToday,
        notifyOverdue,
        notifyRecurring,
      });
      setState(result);
    });
  }

  return (
    <div className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={isPending}>
        <legend className="sr-only">Thông báo trong ứng dụng</legend>
        <Toggle
          checked={notifyReminder}
          label="Nhắc việc đến hạn"
          onChange={setNotifyReminder}
        />
        <Toggle
          checked={notifyDueToday}
          label="Công việc đến hạn hôm nay"
          onChange={setNotifyDueToday}
        />
        <Toggle
          checked={notifyOverdue}
          label="Công việc quá hạn"
          onChange={setNotifyOverdue}
        />
        <Toggle
          checked={notifyRecurring}
          label="Công việc lặp lại mới"
          onChange={setNotifyRecurring}
        />
      </fieldset>

      <button
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={save}
        type="button"
      >
        Lưu thiết lập thông báo
      </button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <input
        checked={checked}
        className="size-4 accent-emerald-700"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
