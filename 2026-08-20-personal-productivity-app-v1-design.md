# ĐẶC TẢ THIẾT KẾ V1 — ỨNG DỤNG QUẢN LÝ CÔNG VIỆC CÁ NHÂN

**Ngày:** 20/08/2026  
**Phiên bản:** V1 — Balanced  
**Ngôn ngữ giao diện:** Tiếng Việt  
**Timezone V1:** Asia/Ho_Chi_Minh (UTC+7)  
**Định hướng:** Web app + PWA, nhiều người dùng độc lập, public signup.

---

## 1. Mục tiêu sản phẩm

Xây dựng một ứng dụng quản lý công việc cá nhân lấy cảm hứng từ Task Tracker Pro, nhưng được triển khai thành web app/PWA thực sự.

Mỗi người dùng có tài khoản riêng và dữ liệu riêng. Một công việc chỉ được lưu một lần trong cơ sở dữ liệu, sau đó được hiển thị dưới nhiều góc nhìn khác nhau:

- Tổng quan
- Danh sách công việc
- Lịch
- Kanban
- Ma trận Eisenhower
- Kế hoạch hôm nay
- Kế hoạch tuần

Ứng dụng ưu tiên:
- dễ sử dụng;
- nhanh;
- giao diện tiếng Việt;
- dùng tốt trên desktop và mobile;
- không thêm các tính năng SaaS/team không cần thiết ở V1.

---

## 2. Phạm vi V1

### Có trong V1

- Public signup.
- Đăng nhập Google.
- Đăng nhập email + mật khẩu.
- Xác minh email.
- Quên/đặt lại mật khẩu.
- Dữ liệu riêng biệt theo user.
- CRUD công việc.
- Dự án.
- Nhiều thẻ cho một công việc.
- Checklist/subtask.
- 4 trạng thái công việc.
- 4 mức ưu tiên.
- Công việc cả ngày hoặc có giờ cụ thể.
- Công việc lặp lại.
- Reminder.
- Thông báo trong ứng dụng.
- Tổng quan.
- Danh sách + bảng công việc.
- Lịch Month/Week/Day.
- Kanban kéo thả.
- Ma trận Eisenhower.
- Kế hoạch hôm nay.
- Trọng tâm hôm nay.
- Kế hoạch tuần.
- Tìm kiếm, lọc, sắp xếp.
- Light/Dark/System theme.
- Responsive desktop/mobile.
- PWA.

### Không có trong V1

- Giao việc cho user khác.
- Team/workspace.
- Comment.
- File attachment.
- Email notification.
- Web push notification.
- Native iOS/Android.
- AI assistant.
- Payment/subscription.
- Custom status.
- Realtime collaboration.
- Microservices.

---

## 3. Người dùng và tài khoản

### Public signup

Bất kỳ ai có link ứng dụng đều có thể tạo tài khoản.

### Phương thức xác thực

1. Google OAuth.
2. Email + mật khẩu.

### Yêu cầu bảo mật

- Email/password do Supabase Auth quản lý.
- Không tự lưu password trong database ứng dụng.
- Email signup phải hỗ trợ verification.
- Mỗi user chỉ có thể đọc/sửa/xóa dữ liệu của chính họ.
- PostgreSQL Row Level Security là lớp bảo vệ bắt buộc.

---

## 4. Ngôn ngữ giao diện

Toàn bộ nội dung người dùng nhìn thấy phải bằng tiếng Việt.

Ví dụ:

| Nội bộ | Giao diện |
|---|---|
| Dashboard | Tổng quan |
| Tasks | Công việc |
| Calendar | Lịch |
| Projects | Dự án |
| Settings | Cài đặt |
| To Do | Cần làm |
| In Progress | Đang thực hiện |
| Done | Hoàn thành |
| Cancelled | Đã hủy |
| Low | Thấp |
| Medium | Trung bình |
| High | Cao |
| Urgent | Khẩn cấp |

Tên biến, bảng, function và các identifier nội bộ có thể dùng tiếng Anh.

---

## 5. Kiến trúc tổng thể

```text
Desktop / Mobile / PWA
          │
          ▼
       Next.js
 ┌────────┼─────────┐
 │        │         │
 UI   Server Logic  Validation
 │        │
 └────┬───┘
      ▼
   Supabase
 ┌────┼─────────────┐
 │    │             │
Auth PostgreSQL     RLS
      │
      ▼
Supabase Cron / Scheduler
      │
 ┌────┴────────┐
 ▼             ▼
Reminder    Recurring
 └────┬────────┘
      ▼
Notifications
```

### Công nghệ

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- PostgreSQL
- Supabase RLS
- dnd-kit
- FullCalendar
- Recharts
- Zod
- Playwright
- Vercel
- PWA manifest + service worker

Không dùng microservices, Redis, Kafka hoặc Kubernetes trong V1.

---

## 6. Điều hướng

### Desktop sidebar

- Tổng quan
- Công việc
- Lịch
- Kanban
- Ma trận Eisenhower
- Kế hoạch hôm nay
- Kế hoạch tuần
- Dự án
- Cài đặt

Nút **+ Công việc mới** phải dễ nhìn và luôn dễ truy cập.

### Mobile bottom navigation

- Trang chủ
- Công việc
- Nút +
- Lịch
- Thêm

Menu **Thêm** chứa:
- Kanban
- Ma trận Eisenhower
- Kế hoạch hôm nay
- Kế hoạch tuần
- Dự án
- Cài đặt

---

## 7. Model công việc

Mỗi công việc có:

- `id`
- `user_id`
- `project_id`
- `title`
- `description`
- `status`
- `priority`
- `start_at`
- `due_at`
- `all_day`
- `important`
- `urgent`
- `eisenhower_override`
- `focus_date`
- `focus_position`
- `kanban_position`
- `recurrence_id` (nullable; liên kết occurrence với chuỗi lặp)
- `recurrence_instance_at` (nullable; mốc thời gian occurrence trong chuỗi)
- `completed_at`
- `created_at`
- `updated_at`

### Trạng thái

- TODO → Cần làm
- IN_PROGRESS → Đang thực hiện
- DONE → Hoàn thành
- CANCELLED → Đã hủy

### Ưu tiên

- LOW → Thấp
- MEDIUM → Trung bình
- HIGH → Cao
- URGENT → Khẩn cấp

### Quy tắc overdue

Không lưu trường `overdue`.

Một task được coi là quá hạn khi:

```text
due_at < thời điểm hiện tại
AND status NOT IN (DONE, CANCELLED)
```

---

## 8. Dự án và thẻ

### Dự án

Một task có thể thuộc 0 hoặc 1 dự án.

`projects`:
- id
- user_id
- name
- color
- icon
- archived
- created_at
- updated_at

Xóa dự án không xóa task. Các task thuộc dự án đó trở thành **Không có dự án**.

### Thẻ

Một task có thể có nhiều thẻ.

`tags`:
- id
- user_id
- name
- color

`task_tags`:
- task_id
- tag_id

Xóa tag chỉ xóa quan hệ tag, không xóa task.

---

## 9. Checklist / Subtask

Subtask là checklist nhẹ, không phải task độc lập hoàn chỉnh.

`subtasks`:
- id
- task_id
- title
- completed
- position
- created_at
- updated_at

Task cha vẫn được phép chuyển sang **Hoàn thành** khi checklist chưa hoàn tất 100%.

---

## 10. Quick Add

Tạo task nhanh chỉ yêu cầu:

- Tên công việc.
- Ngày mặc định nếu có.
- Ưu tiên mặc định.
- Dự án nếu muốn.

Các trường nâng cao chỉ mở khi user chọn **Thêm tùy chọn**:

- Mô tả.
- Dự án.
- Thẻ.
- Bắt đầu.
- Hạn chót.
- Ưu tiên.
- Trạng thái.
- Eisenhower.
- Reminder.
- Lặp lại.
- Checklist.

Mục tiêu: tạo một task cơ bản trong vài giây.

---

## 11. Chi tiết công việc

Desktop: mở side panel.

Mobile: mở full-screen detail page.

Cho phép chỉnh:
- title;
- description;
- status;
- priority;
- project;
- tags;
- start/due;
- all-day;
- Eisenhower;
- checklist;
- reminder;
- recurrence.

---

## 12. Tổng quan

Dashboard ưu tiên câu hỏi:

> Hôm nay cần làm gì và tình hình công việc hiện tại ra sao?

Hiển thị:

- Số task hôm nay.
- Số task đang thực hiện.
- Số task quá hạn.
- Tỷ lệ hoàn thành.
- Danh sách hôm nay.
- Upcoming.
- Progress theo dự án.
- Status breakdown.

Khu **Cần chú ý** chỉ hiện khi có task quá hạn.

---

## 13. Màn hình Công việc

Có hai chế độ:

1. Danh sách.
2. Bảng.

Tab nhanh:
- Tất cả.
- Hôm nay.
- Sắp tới.
- Quá hạn.

Filter:
- Dự án.
- Thẻ.
- Ưu tiên.
- Trạng thái.

Sort:
- Hạn chót.
- Ưu tiên.
- Ngày tạo.
- Dự án.
- Trạng thái.

---

## 14. Calendar

View:
- Tháng.
- Tuần.
- Ngày.

Hỗ trợ:
- all-day task;
- timed task;
- drag đổi ngày/giờ;
- resize duration;
- click mở Task Detail.

Khi deadline thay đổi:
- cập nhật `due_at`;
- cập nhật `start_at` nếu phù hợp;
- tính lại reminder;
- tính lại Eisenhower nếu đang ở chế độ Auto.

### Recurring occurrence

Khi kéo occurrence lặp lại, V1 hỗ trợ:

- Chỉ lần này.
- Lần này và các lần sau.

---

## 15. Kanban

4 cột:

- Cần làm.
- Đang thực hiện.
- Hoàn thành.
- Đã hủy.

Kéo card giữa cột cập nhật status.

Chuyển vào Done:
- set `completed_at`.

Chuyển ra khỏi Done:
- `completed_at = null`.

Hỗ trợ:
- filter;
- smart sort;
- manual order;
- optimistic UI;
- rollback khi backend lỗi.

---

## 16. Ma trận Eisenhower

4 ô:

1. Làm ngay.
2. Lên lịch.
3. Ủy quyền.
4. Loại bỏ.

Vì ứng dụng không có giao việc cho user khác, từ **Ủy quyền** có thể kèm tooltip giải thích đây là quadrant Delegate tiêu chuẩn.

### Auto suggestion

Mặc định:

- Priority HIGH hoặc URGENT → gợi ý Important.
- Deadline còn <= 24 giờ hoặc overdue → gợi ý Urgent.

### Manual override

User có thể kéo task sang quadrant khác.

Khi đó:

```text
eisenhower_override = true
```

Sau khi override, các thay đổi deadline/priority không tự chuyển quadrant nữa.

Nút **Đặt lại theo gợi ý**:

```text
eisenhower_override = false
```

---

## 17. Kế hoạch hôm nay

Hiển thị các nhóm:

- Quá hạn.
- Hôm nay.
- Cả ngày.
- Hoàn thành.

Task xuất hiện nếu:
- due date là hôm nay;
- start date là hôm nay;
- overdue;
- recurring occurrence của hôm nay.

Một task có start hôm nay nhưng due nhiều ngày sau chỉ được đưa vào Daily Plan theo logic này, không tự lặp mỗi ngày giữa start và due.

---

## 18. Trọng tâm hôm nay

User được ghim tối đa 3 task trọng tâm trong ngày.

Không dùng AI tự chọn ở V1.

Hiển thị:
- thứ tự 1–3;
- drag đổi thứ tự;
- xóa khỏi Focus.

---

## 19. Kế hoạch tuần

Hai view:

- Bảng theo ngày.
- Lịch trình.

Hiển thị:
- task theo từng ngày;
- workload;
- tiến độ tuần;
- progress theo dự án.

Workload V1 dựa trên số task chưa hoàn thành.

Ví dụ:
- >= 7 task/ngày → cảnh báo **Ngày bận**.

Không tự động reschedule.

---

## 20. Reminder

User có một hoặc nhiều default reminder trong Settings nhưng từng task có thể override toàn bộ danh sách reminder.

`task_reminders`:
- id
- task_id
- user_id
- offset_minutes
- remind_at
- triggered_at
- created_at

Ví dụ:
- 60 phút.
- 1440 phút.
- 4320 phút.

Khi deadline thay đổi:

```text
remind_at = due_at - offset_minutes
```

Reminder không phụ thuộc browser đang mở.

---

## 21. Notification

V1 chỉ có in-app notification.

Loại:
- REMINDER
- DUE_TODAY
- OVERDUE
- RECURRING_CREATED

`notifications`:
- id
- user_id
- task_id
- type
- title
- message
- read_at
- created_at

Hỗ trợ:
- unread badge;
- đánh dấu đã đọc;
- đánh dấu tất cả đã đọc;
- xóa notification;
- clear notification đã đọc;
- click mở task.

Overdue notification chỉ tạo một lần khi task chuyển sang overdue.

---

## 22. Recurring Task

V1 hỗ trợ:

- Hàng ngày.
- Hàng tuần.
- Hàng tháng.
- Hàng năm.

`task_recurrences` đại diện cho **một chuỗi lặp**, không phải một occurrence riêng lẻ:
- id
- user_id
- root_task_id
- frequency
- interval
- weekdays
- month_day
- ends_at
- next_occurrence_at
- active
- created_at
- updated_at

Mỗi task occurrence lưu `recurrence_id` để biết nó thuộc chuỗi nào. Cách này cho phép phân biệt rõ **chỉ lần này** và **lần này + các lần sau** khi chỉnh Calendar.

Không hỗ trợ các recurrence cực phức tạp như:
- thứ N thứ X trong tháng;
- loại trừ ngày lễ.

### Tạo occurrence

Hybrid strategy:

1. Khi user hoàn thành occurrence → hệ thống có thể tạo occurrence tiếp nếu occurrence đó chưa tồn tại.
2. Cron kiểm tra định kỳ để bảo đảm occurrence cần thiết không bị thiếu nếu task trước chưa hoàn thành.
3. Việc tạo occurrence phải **idempotent**: cùng một chuỗi + cùng một `recurrence_instance_at` chỉ được tạo tối đa một task.

Occurrence cũ được giữ để bảo toàn lịch sử. Khi user chọn **Chỉ lần này**, chỉ occurrence hiện tại thay đổi. Khi chọn **Lần này và các lần sau**, rule của `task_recurrences` và các occurrence tương lai chưa hoàn thành được điều chỉnh theo mốc mới.

---

## 23. Notifications và Scheduler

Scheduler chạy server-side.

### Reminder job

```text
Find task_reminders
WHERE remind_at <= now
AND triggered_at IS NULL

→ create notification
→ set triggered_at
```

### Recurring job

Kiểm tra:
- occurrence đến hạn;
- occurrence tiếp theo chưa tồn tại.

Sau đó tạo occurrence mới.

Ưu tiên dùng Supabase Cron.

---

## 24. Settings

### Hồ sơ

- Avatar.
- Tên hiển thị.
- Email.

### Giao diện

- Sáng.
- Tối.
- Theo hệ thống.

### Mặc định công việc

- Ưu tiên mặc định.
- Reminder mặc định.
- Tuần bắt đầu vào Thứ Hai.
- View task mặc định.

### Thông báo

Toggle:
- Nhắc việc.
- Đến hạn hôm nay.
- Quá hạn.
- Công việc lặp được tạo.

### Timezone

Hiển thị cố định:

`Asia/Ho_Chi_Minh (UTC+7)`

Không chỉnh ở V1.

### Tài khoản

- Đổi mật khẩu.
- Đăng xuất.
- Xóa tài khoản.

Xóa tài khoản yêu cầu xác nhận rõ ràng và xóa toàn bộ dữ liệu người dùng.

---

## 25. Search

Global search ở top bar.

Phím `/` có thể focus search.

Search V1:
- task title;
- task description;
- project;
- tag.

Không dùng AI/semantic search.

PostgreSQL search là đủ cho V1.

---

## 26. Responsive

### Mobile < 768 px

- Bottom navigation.
- Floating + button.
- Calendar ưu tiên chế độ Lịch trình.
- Eisenhower dùng tab/swipe.
- Kanban hiển thị từng cột/swipe.
- Task Detail full-screen.

### Tablet 768–1024 px

- Sidebar thu gọn.
- Layout thích ứng.

### Desktop > 1024 px

- Sidebar cố định.
- Side panel task detail.
- Dashboard nhiều cột.

---

## 27. PWA

PWA cần:

- manifest;
- icon;
- theme color;
- start URL;
- `display: standalone`;
- service worker.

Mục tiêu:
- Add to Home Screen.
- Mở gần giống app native.
- Một codebase cho desktop/mobile.

Offline-first đầy đủ không phải yêu cầu của V1.

---

## 28. Database

Các bảng:

```text
profiles
projects
tags
tasks
task_tags
subtasks
task_reminders
task_recurrences
notifications
user_settings
```

### `user_settings`

- `user_id`
- `theme`
- `default_priority`
- `default_reminder_offsets_minutes` — mảng số phút; ví dụ `[1440, 0]` = 1 ngày trước + đúng hạn
- `week_start`
- `default_task_view`
- `notify_reminder`
- `notify_due_today`
- `notify_overdue`
- `notify_recurring`

Timezone không lưu theo user ở V1 vì được cố định ở `Asia/Ho_Chi_Minh`.

---

## 29. Row Level Security

Mỗi bảng dữ liệu theo user phải có RLS.

Ví dụ task:

```text
SELECT/UPDATE/DELETE:
tasks.user_id = auth.uid()
```

INSERT phải bảo đảm:

```text
new.user_id = auth.uid()
```

Các quan hệ con phải được bảo vệ thông qua ownership của user/task tương ứng.

RLS phải được test bằng integration test, không chỉ tin vào frontend.

---

## 30. Data flow

Ví dụ đổi priority:

```text
UI
→ optimistic update
→ server validation
→ database
→ nếu Eisenhower Auto: tính lại suggestion
→ refresh relevant views
```

Ví dụ drag calendar:

```text
Calendar
→ update start/due
→ recompute reminders
→ recompute Eisenhower nếu Auto
→ Dashboard/Daily/Weekly tự phản ánh dữ liệu mới
```

---

## 31. Validation

Zod schemas dùng chung giữa frontend và server khi phù hợp.

Ví dụ:
- title: 1–200 ký tự;
- description: optional;
- priority: enum;
- status: enum;
- date/time hợp lệ;
- reminder offset không âm.

Lỗi kỹ thuật nội bộ không được hiển thị trực tiếp cho user.

---

## 32. Error handling

Thông báo tiếng Việt.

Ví dụ:

- Không tìm thấy công việc.
- Bạn không có quyền thực hiện thao tác này.
- Thời hạn không hợp lệ.
- Không thể cập nhật công việc. Vui lòng thử lại.
- Đã xảy ra lỗi. Vui lòng thử lại.

Drag/drop dùng optimistic UI, nhưng rollback nếu request lỗi.

---

## 33. Empty / Loading State

Không để màn hình trắng.

Ví dụ:
- Chưa có công việc.
- Hôm nay bạn không có việc cần xử lý.
- Chưa có công việc đang thực hiện.

Loading dùng skeleton.

---

## 34. Testing

### Unit

- Eisenhower suggestion.
- Recurring calculation.
- Reminder calculation.
- Overdue calculation.

### Integration

- Create/update/delete task.
- Project/tag relation.
- RLS.
- Reminder creation/update.
- Recurring occurrence.

### E2E với Playwright

Flow cơ bản:

```text
Đăng ký
→ đăng nhập
→ tạo task
→ kéo Kanban
→ kiểm tra Calendar
→ hoàn thành task
```

---

## 35. Deployment

### Source

GitHub.

### App

Vercel.

### Database/Auth/Cron

Supabase.

### Environment

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

`SUPABASE_SERVICE_ROLE_KEY` chỉ tồn tại server-side.

---

## 36. Bảo mật V1

Tối thiểu:

- HTTPS.
- RLS.
- Server-side authorization.
- Zod validation.
- Không expose service role key.
- Auth do Supabase xử lý.
- Secure session/cookie theo Supabase/Next.js recommended flow.
- Rate limiting cho endpoint nhạy cảm nếu cần.
- Không tin dữ liệu `user_id` từ client.

---

## 37. Cấu trúc source đề xuất

```text
src/
├── app/
│   ├── (auth)/
│   └── (dashboard)/
├── components/
│   ├── tasks/
│   ├── calendar/
│   ├── kanban/
│   ├── eisenhower/
│   ├── dashboard/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── recurrence/
│   ├── reminders/
│   └── validation/
├── actions/
│   ├── task-actions.ts
│   ├── project-actions.ts
│   └── notification-actions.ts
└── types/
```

Tách component theo feature; tránh file khổng lồ chứa nhiều trách nhiệm.

---

## 38. Các nguyên tắc UX

1. Một task chỉ lưu một lần.
2. Mọi view dùng chung nguồn dữ liệu.
3. Thao tác phổ biến hoàn thành trong 1–2 click.
4. Quick Add phải thật nhanh.
5. Advanced fields chỉ mở khi cần.
6. Drag/drop phải phản hồi ngay.
7. Mobile và desktop đều là first-class experience.
8. UI hoàn toàn bằng tiếng Việt.
9. Không thêm tính năng chỉ vì “có thể làm”.
10. Không để automation tự ghi đè lựa chọn Eisenhower thủ công.

---

## 39. Tiêu chí hoàn thành V1

V1 được coi là hoàn thành khi:

- User mới có thể tự đăng ký.
- Google và email/password đều hoạt động.
- RLS chặn truy cập chéo user.
- User tạo/sửa/xóa task được.
- Project/tag/subtask hoạt động.
- Task hiển thị nhất quán ở mọi view.
- Kanban drag/drop cập nhật đúng.
- Calendar drag/resize cập nhật đúng.
- Eisenhower Auto/Manual hoạt động đúng.
- Daily/Weekly Plan phản ánh đúng ngày.
- Recurring tạo occurrence đúng.
- Reminder tạo in-app notification đúng kể cả khi browser đã đóng.
- Responsive hoạt động trên mobile và desktop.
- PWA cài được.
- Không còn lỗi blocker trong các flow chính.

---

## 40. Ước lượng triển khai

### Tuần 1
- Project bootstrap.
- Auth.
- Database.
- RLS.
- Task CRUD.
- Projects.
- Tags.
- Subtasks.
- Task List.

### Tuần 2
- Dashboard.
- Kanban.
- Calendar.
- Eisenhower.
- Daily Plan.
- Weekly Plan.

### Tuần 3
- Recurring.
- Reminder.
- Notifications.
- Search/filter.
- Settings.
- PWA.
- Responsive.
- Testing.

### Tuần 4 — khuyến nghị
- Bug fixing.
- Edge cases.
- Mobile polish.
- Calendar polish.
- Recurrence testing.
- Performance.
- Release cho bạn bè dùng thử.

Mục tiêu:
- khoảng 3 tuần để có V1 khả dụng;
- khoảng 4 tuần để có bản tương đối chắc chắn và đẹp để đưa cho người khác dùng.

---

## 41. Các quyết định đã khóa cho V1

- Nhiều user độc lập.
- Public signup.
- Google + Email/Password.
- Không giao task cho nhau.
- Project + Tags.
- 4 status.
- 4 priority.
- Recurring ngay V1.
- In-app notification.
- Default reminder + task override.
- Eisenhower Auto + Manual Override.
- Subtask/checklist.
- All-day + timed tasks.
- Timezone cố định Asia/Ho_Chi_Minh.
- Không attachment.
- PWA.
- Desktop/mobile cân bằng.
- Giao diện người dùng hoàn toàn bằng tiếng Việt.

---

## 42. Các giả định V1

- Đối tượng sử dụng chủ yếu ở Việt Nam.
- Quy mô ban đầu từ vài người đến vài trăm user.
- Không yêu cầu cộng tác realtime.
- Không có billing.
- Không có dữ liệu nhạy cảm ngoài dữ liệu công việc cá nhân thông thường.
- Supabase/Vercel free hoặc low-cost tier phù hợp cho giai đoạn đầu.

---

## 43. Hướng mở rộng V2+

Có thể bổ sung sau khi V1 có usage thực tế:

- File attachment.
- Email notification.
- Web push.
- Sharing.
- Team/workspace.
- Comment.
- Template.
- Command palette.
- Smart scheduling.
- AI assistant.
- Natural-language task creation.
- Calendar integration.
- Native mobile app.
- Timezone theo user.
- Custom status.
- Advanced analytics.

Không triển khai các mục này trong V1 trừ khi scope được thay đổi chính thức.
