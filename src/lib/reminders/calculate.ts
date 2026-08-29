export function calculateRemindAt(
  dueAt: Date,
  offsetMinutes: number,
): Date {
  return new Date(
    dueAt.getTime() - offsetMinutes * 60 * 1000,
  );
}


export function recalculateReminderRows(
  dueAt: Date,
  offsets: number[],
) {
  return offsets.map((offsetMinutes) => ({
    offsetMinutes,
    remindAt: calculateRemindAt(dueAt, offsetMinutes),
  }));
}