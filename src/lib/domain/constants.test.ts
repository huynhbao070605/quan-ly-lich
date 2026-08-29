import { expect, test } from "vitest";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "./constants";

test("status và priority hiển thị bằng tiếng Việt", () => {
  expect(TASK_STATUS_LABELS.TODO).toBe("Cần làm");
  expect(TASK_STATUS_LABELS.IN_PROGRESS).toBe("Đang thực hiện");
  expect(TASK_STATUS_LABELS.DONE).toBe("Hoàn thành");
  expect(TASK_STATUS_LABELS.CANCELLED).toBe("Đã hủy");
  expect(TASK_PRIORITY_LABELS.URGENT).toBe("Khẩn cấp");
});
