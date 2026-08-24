"use client";

const presets = [
  { label: "3 ngày trước", value: 4320 },
  { label: "1 ngày trước", value: 1440 },
  { label: "1 giờ trước", value: 60 },
  { label: "10 phút trước", value: 10 },
  { label: "Đúng hạn", value: 0 },
];

type ReminderEditorProps = {
  disabled?: boolean;
  label?: string;
  onChange: (offsets: number[]) => void;
  value: number[];
};

function toggleOffset(
  current: number[],
  offset: number,
): number[] {
  const next = current.includes(offset)
    ? current.filter((value) => value !== offset)
    : [...current, offset];

  return [...new Set(next)].toSorted((a, b) => b - a);
}

export function ReminderEditor({
  disabled = false,
  label = "Nhắc việc",
  onChange,
  value,
}: ReminderEditorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-700"
            key={preset.value}
          >
            <input
              checked={value.includes(preset.value)}
              className="size-4 accent-teal-700"
              onChange={() => onChange(toggleOffset(value, preset.value))}
              type="checkbox"
            />
            {preset.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
