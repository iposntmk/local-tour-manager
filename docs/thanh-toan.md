# Luồng thanh toán tour

Cập nhật: 2026-06-16

Tài liệu này mô tả luồng thanh toán tour cho HDV. Khoản thanh toán này được lưu riêng trong `tour_payments` và được tổng hợp về các trường thanh toán trên bảng `tours`.

## Mục đích

Thanh toán tour là bước sau khi hồ sơ quyết toán đã được kế toán duyệt. Hệ thống cho phép ghi nhận một hoặc nhiều đợt thanh toán, tính tổng đã trả, số còn lại, phương thức thanh toán cuối cùng và trạng thái thanh toán của tour.

## Điều kiện hiển thị và thao tác

- Tour chỉ đủ điều kiện ghi nhận thanh toán khi `settlementStatus` là `approved` hoặc `closed`.
- Người thao tác phải có quyền `mark_tour_paid`.
- Nếu `paymentStatus` đã là `paid`, nút ghi nhận thanh toán mới sẽ không hiện theo helper `canRecordPayment`.
- UI vẫn hiện badge thanh toán khi tour đã duyệt/đóng, kể cả khi không còn được phép thêm đợt thanh toán.

## Các màn hình và file chính

- `src/components/tours/SettlementActionsBar.tsx`: hiện nút "Ghi nhận thanh toán" trên thanh hành động sau khi tour đủ điều kiện.
- `src/components/tours/TourPaymentsPanel.tsx`: hiện tổng tour, đã thanh toán, còn lại và danh sách các đợt thanh toán.
- `src/components/tours/RecordPaymentDialog.tsx`: form tạo/sửa đợt thanh toán.
- `src/lib/payment-utils.ts`: tính tổng cần thanh toán, số còn lại, điều kiện thao tác và label trạng thái.
- `src/lib/datastore/modules/tour-operations/tour-payments.ts`: các hàm `listTourPayments`, `addTourPayment`, `updateTourPayment`, `deleteTourPayment`.
- `supabase/migrations/20260520140000_add_tour_payment_tracking.sql`: bảng `tour_payments`, trigger tính lại trạng thái thanh toán.
- `supabase/migrations/20260520150000_reset_payments_on_reopen.sql`: xóa lịch sử thanh toán khi mở khóa hồ sơ đã duyệt/đóng.

## Dữ liệu liên quan

Bảng `tour_payments` lưu mỗi đợt thanh toán:

- `tour_id`: tour được thanh toán.
- `amount`: số tiền, bắt buộc lớn hơn 0.
- `payment_method`: `cash` hoặc `bank_transfer`.
- `paid_at`: thời điểm/ngày thanh toán.
- `paid_by`: user ghi nhận thanh toán, nếu có.
- `note`: ghi chú tùy chọn.
- `created_at`, `updated_at`: mốc thời gian audit.

Bảng `tours` có các trường tổng hợp do trigger cập nhật:

- `payment_status`: `pending`, `partial`, `paid`.
- `payment_total`: tổng các dòng trong `tour_payments`.
- `last_paid_at`: thời điểm thanh toán gần nhất.
- `last_payment_method`: phương thức của đợt thanh toán gần nhất.

## Luồng tạo mới thanh toán

1. Người dùng mở tour đã có `settlementStatus = approved` hoặc `closed`.
2. `store.getTour()` lấy tour kèm `tour_payments(*)`; mapper đưa về `tour.payments`.
3. UI tính:
   - `finalTotal = summary.finalTotal` nếu có, nếu không lấy `summary.totalTabs`;
   - `paymentTotal` từ trường tổng hợp trên `tours`;
   - `remaining = max(0, finalTotal - paymentTotal)`.
4. Người dùng bấm "Ghi nhận thanh toán".
5. `RecordPaymentDialog` mặc định:
   - số tiền bằng số còn lại;
   - phương thức `cash`;
   - ngày hiện tại;
   - ghi chú rỗng.
6. Khi lưu, UI kiểm tra:
   - số tiền phải lớn hơn 0;
   - số tiền của dòng đang nhập không vượt quá tổng tour.
7. UI cập nhật cache lạc quan để màn hình phản hồi ngay.
8. Datastore gọi `store.addTourPayment(tour.id, paymentPatch)`.
9. Supabase insert vào `tour_payments`.
10. Trigger `tour_payments_validate_settlement` chặn insert/update nếu tour chưa `approved` hoặc `closed`.
11. Trigger `tour_payments_after_change` gọi `refresh_tour_payment_summary`.
12. `refresh_tour_payment_summary` tính lại tổng đã trả, ngày/phương thức gần nhất và trạng thái thanh toán trên `tours`.
13. UI invalidate cache `tour`, các aggregate query và hiện toast thành công.

## Luồng sửa thanh toán

1. Trong `TourPaymentsPanel`, người có quyền `mark_tour_paid` bấm nút sửa trên một dòng thanh toán.
2. Dialog nạp lại `amount`, `method`, `paidAt`, `note` của dòng đó.
3. Khi lưu, UI tạo patch và cập nhật cache lạc quan.
4. Datastore gọi `store.updateTourPayment(payment.id, patch)`.
5. DB update dòng `tour_payments`.
6. Trigger validate lại trạng thái quyết toán và tính lại `tours.payment_*`.
7. Nếu lỗi, UI khôi phục cache snapshot và hiện lỗi tiếng Việt.

## Luồng xóa thanh toán

1. Người dùng bấm nút xóa trong `TourPaymentsPanel`.
2. UI hiện dialog xác nhận.
3. Khi xác nhận, UI tạm thời bỏ dòng thanh toán khỏi cache.
4. Datastore gọi `store.deleteTourPayment(payment.id)`.
5. DB xóa dòng `tour_payments`.
6. Trigger tính lại `payment_total`, `payment_status`, `last_paid_at`, `last_payment_method`.
7. Nếu xóa lỗi, UI khôi phục cache snapshot.

## Cách tính trạng thái thanh toán

Trigger SQL tính `payment_status` như sau:

- `pending`: tổng đã trả `<= 0`.
- `paid`: tổng đã trả `>= final_total` và `final_total > 0`.
- `partial`: các trường hợp còn lại, ví dụ đã trả một phần nhưng chưa đủ tổng tour.

UI hiện label:

- `pending`: "Chờ thanh toán".
- `partial`: "Thanh toán một phần".
- `paid`: "Đã thanh toán"; nếu có phương thức gần nhất thì hiện kèm "Tiền mặt" hoặc "Chuyển khoản".

## Mở khóa quyết toán và thanh toán

Khi tour chuyển từ `approved`/`closed` về trạng thái không duyệt/đóng, trigger `tours_reset_payments_on_unlock` xóa tất cả dòng trong `tour_payments` của tour. Trigger của `tour_payments` sau đó tính lại:

- `payment_total = 0`;
- `payment_status = pending`;
- `last_paid_at = null`;
- `last_payment_method = null`.

Điều này tránh việc giữ lại thanh toán của một hồ sơ đã bị mở khóa và có thể thay đổi tổng quyết toán.

## Quyền và RLS

RLS sau khi harden yêu cầu:

- đọc `tour_payments`: user phải xem được tour qua `can_view_tour(tour_id)`;
- insert/update/delete `tour_payments`: user phải xem được tour và có quyền `mark_tour_paid`.

Trong UI, nút tạo/sửa/xóa cũng được chặn bởi permission guard và helper `canRecordPayment`/`canEditPayment`.

## Lỗi thường gặp

- Hồ sơ chưa duyệt: DB trả lỗi vì trigger không cho ghi thanh toán trước khi `settlement_status` là `approved` hoặc `closed`.
- Thiếu quyền `mark_tour_paid`: UI không hiện nút, RLS cũng chặn ghi DB.
- Tổng tour bằng 0: trigger không thể chuyển sang `paid`; nếu có thanh toán thì trạng thái sẽ vào `partial`.
- Mở khóa hồ sơ: các dòng thanh toán bị xóa theo trigger, nên cần ghi nhận lại sau khi hồ sơ được duyệt lại.
