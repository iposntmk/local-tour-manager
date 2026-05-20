 Có. Hai trường này là hai chiều quyền độc lập, cộng dồn quyền cuối cùng cho user. Cụ thể:

  1. role — "Vai trò" hệ thống (UserRole)

  Mục đích: cấp truy cập tổng thể vào app, không liên quan tới quy trình quyết toán.

  - admin (Quản trị viên) — toàn quyền (ALL_PERMISSIONS)
  - editor (Biên tập viên) — CRUD tour + master data, xem thống kê
  - viewer (Người xem) — chỉ đọc tour + master data

  → Nguồn quyền: ROLE_PERMISSIONS[role] ở src/types/user.ts:266.

  2. settlementRole — "Vai trò quyết toán" (SettlementRole)

  Mục đích: vị trí trong workflow quyết toán (gửi chứng từ → kế toán duyệt → thanh toán). Hoàn toàn độc lập với role.

  - none (Không tham gia) — không liên quan tới quy trình quyết toán
  - guide (Hướng dẫn viên) — được phép submit_settlement (gửi hồ sơ)
  - accountant (Kế toán) — được phép review_settlement_line + approve_settlement (duyệt/trả lại hồ sơ)

  → Nguồn quyền: SETTLEMENT_ROLE_PERMISSIONS[settlementRole] ở src/types/user.ts:296.

  Tại sao tách 2 trường?

  Vì hai chiều này trực giao nhau. Ví dụ:
  - Một HDV vẫn cần role=editor để tự tạo/sửa tour của mình, đồng thời settlementRole=guide để gửi quyết toán.
  - Một kế toán chỉ duyệt chứng từ, không cần tạo tour → có thể đặt role=viewer + settlementRole=accountant.
  - Một admin nội bộ không tham gia workflow → role=admin + settlementRole=none.

  Cách tính quyền cuối cùng (effective permissions)

  Ở getEffectivePermissions() (src/types/user.ts:332):

  1. Nếu là admin hoặc email iposntmk@gmail.com → trả về ALL_PERMISSIONS.
  2. Nếu user có override permissions[] riêng (gán thủ công ở trang Users) → dùng đúng list đó.
  3. Nếu không → hợp 2 tập: ROLE_PERMISSIONS[role] ∪ SETTLEMENT_ROLE_PERMISSIONS[settlementRole].

  Tức là settlementRole thêm quyền vào chứ không thay thế quyền hệ thống.

  Lưu ý quan trọng với case kế toán hiện tại

  Quyền mark_tour_paid (ghi nhận thanh toán) chưa có trong SETTLEMENT_ROLE_PERMISSIONS.accountant — chỉ có review_settlement_line +
  approve_settlement. Nếu muốn kế toán mặc định ghi nhận thanh toán được luôn, cần thêm mark_tour_paid vào dòng
  src/types/user.ts:299, hoặc gán thủ công qua override permissions[] ở trang Users.
