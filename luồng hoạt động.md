Luồng sử dụng quản lý thanh toán tour

  1. Chuẩn bị (admin, 1 lần)

  - Vào Người dùng → Phân quyền, gán quyền "Ghi nhận thanh toán tour" (mark_tour_paid) cho các user phụ trách trả tiền HDV (thường là
   kế toán / admin).
  - Quyền này KHÔNG mặc định cho role nào — phải cấp thủ công.

  2. HDV nộp hồ sơ (như cũ)

  1. HDV mở tour, nhập đầy đủ điểm đến / chi phí / bữa ăn / phụ cấp.
  2. Bấm "Gửi kế toán" trên SettlementActionsBar.
  3. Tour chuyển settlement_status = submitted → kế toán thấy ở danh sách chờ duyệt.

  3. Kế toán duyệt (như cũ)

  - Review từng dòng → bấm "Duyệt" → settlement_status = approved và tour bị khóa edit.
  - Lúc này badge thanh toán xuất hiện: 🟠 Chờ thanh toán. Nút "Ghi nhận thanh toán" cũng hiện trên thanh action (chỉ user có quyền
  mark_tour_paid mới thấy).

  4. Ghi nhận thanh toán (trạng thái mới)

  Bấm "Ghi nhận thanh toán" → mở RecordPaymentDialog:
  - Số tiền: mặc định = phần còn lại (final_total − đã trả). Cho phép sửa nếu trả lẻ.
  - Hình thức: Tiền mặt / Chuyển khoản (radio).
  - Ngày thanh toán: mặc định hôm nay.
  - Ghi chú: tùy chọn.

  Sau khi lưu, trigger DB tự động cập nhật:
  - payment_total += amount
  - payment_status = pending | partial | paid tùy payment_total so với final_total.
  - last_paid_at, last_payment_method = lần trả mới nhất.

  → Badge cập nhật real-time: 🟡 Thanh toán một phần hoặc 🟢 Đã thanh toán – Tiền mặt/Chuyển khoản.

  5. Trả nhiều lần (partial)

  - Mỗi lần trả là 1 record trong tour_payments. Ví dụ:
    - Lần 1: 5.000.000₫ tiền mặt → status = partial
    - Lần 2: 3.000.000₫ chuyển khoản → status = partial
    - Lần 3: 2.000.000₫ chuyển khoản → status = paid (vì đủ 10tr)
  - Trong tab Tổng kết của tour có panel "Thanh toán cho HDV" liệt kê toàn bộ lịch sử: số tiền, hình thức, ngày, ghi chú, kèm tổng đã
   trả / còn lại.
  - Có thể sửa (icon bút) hoặc xóa (icon thùng rác) từng dòng — trigger sẽ tự recompute lại tổng.

  6. Xem & lọc trên danh sách tour

  - Trang Tours: thêm dropdown filter "Thanh toán" (Tất cả / Chờ thanh toán / Một phần / Đã thanh toán).
  - Trong bảng, cạnh mã tour có badge nhỏ hiển thị trạng thái thanh toán (chỉ với tour đã approved/closed).

  7. Edge cases

  - Chưa duyệt thì không trả được: trigger DB chặn insert tour_payments khi settlement_status chưa phải approved/closed.
  - Admin mở khóa tour (reopen): lịch sử thanh toán KHÔNG bị xóa. Nếu HDV sửa làm final_total thay đổi → trigger tự re-compute lại
  payment_status (ví dụ trước đó "paid" giờ thành "partial" vì tổng tăng).
  - User không có quyền mark_tour_paid: không thấy nút "Ghi nhận thanh toán", không thấy nút sửa/xóa từng dòng — chỉ xem.

  Tóm tắt 4 trạng thái lifecycle theo yêu cầu ban đầu

  ┌─────┬───────────────────────────────────┬────────────────────────────────────────────────────────────────────┐
  │  #  │         Mô tả người dùng          │                         Map trong hệ thống                         │
  ├─────┼───────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ 1   │ Đã gửi chứng từ đến văn phòng     │ settlement_status = submitted                                      │
  ├─────┼───────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ 2   │ Chờ kế toán duyệt                 │ settlement_status = submitted (cùng state, góc nhìn kế toán)       │
  ├─────┼───────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ 3   │ Kế toán đã duyệt & chờ thanh toán │ settlement_status = approved + payment_status = pending            │
  ├─────┼───────────────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ 4   │ Đã thanh toán                     │ payment_status = paid (+ last_payment_method = cash/bank_transfer) │
  └─────┴───────────────────────────────────┴────────────────────────────────────────────────────────────────────┘

✻ Brewed for 29s

※ recap: Goal: add tour payment tracking (4 lifecycle states, cash/bank_transfer, partial pay). All 9 tasks done — DB migration,
  types, store, UI, filter, tests passing. Next: grant `mark_tour_paid` permission to relevant users and test end-to-end in browser.
  (disable recaps in /config)