"use client";

import { useState, useTransition } from "react";

import { setDefaultReminderOffsets } from "@/actions/reminder-actions";
import { ReminderEditor } from "@/components/tasks/reminder-editor";

type ReminderDefaultsFormProps = {
  initialOffsets: number[];
};

export function ReminderDefaultsForm({
  initialOffsets,
}: ReminderDefaultsFormProps) {
  const [offsets, setOffsets] = useState(initialOffsets);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setDefaultReminderOffsets(offsets);
      setMessage(
        result.ok
          ? "Đã lưu nhắc việc mặc định."
          : result.message,
      );
    });
  }

  return (
    <div className="space-y-4">
      <ReminderEditor
        disabled={isPending}
        label="Nhắc việc mặc định"
        onChange={setOffsets}
        value={offsets}
      />
      <button
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={save}
        type="button"
      >
        Lưu nhắc việc
      </button>
      {message ? (
        <p className="text-sm text-slate-700" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
