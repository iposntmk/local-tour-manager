# Scale Planning & Architecture Decisions

Tài liệu này ghi lại các quyết định thiết kế khi mở rộng app cho ~300 hướng dẫn viên.

---

## Quyết định: Gộp Guide vào User (Option C)

### Lý do

Hệ thống cũ có hai khái niệm riêng biệt không liên kết:
- `Guide` (master data): tên, SĐT, ngôn ngữ — tham chiếu trong tour qua `guideRef: EntityRef`
- `User` với `settlementRole='guide'`: tài khoản app — có thể submit quyết toán

**Vấn đề:** Không có cơ chế lọc tour theo HDV đăng nhập, thống kê không cá nhân hóa, không xác minh "người submit = HDV của tour".

**Lý do chọn Option C (thay vì thêm userId vào Guide):**
- Tất cả HDV đều có email thật, số điện thoại, mã số thẻ HDV
- Một nguồn dữ liệu duy nhất, không duy trì 2 bảng song song
- HDV đăng nhập app → thấy đúng tour của mình → submit quyết toán

### Thay đổi database

**Thêm vào `user_profiles`:**
| Column | Kiểu | Ghi chú |
|---|---|---|
| `phone` | TEXT | Số điện thoại |
| `guide_note` | TEXT | Ghi chú nội bộ |
| `is_default_guide` | BOOLEAN | HDV mặc định cho tour mới |
| `guide_card_id` | TEXT UNIQUE | Mã số thẻ hướng dẫn viên |

**Bảng mới:**
- `user_languages (user_id, language_id, proficiency)` — thay thế `guide_languages`
- `user_bank_accounts (user_id, bank_name, account_number, account_holder, branch, is_default)` — tài khoản ngân hàng nhận lương

**Bảng xóa (sau migration):**
- `guide_languages`
- `guides`

**Tours:** `tours.guide_id` FK đổi từ `guides.id` → `user_profiles.id`. Column `guide_name_at_booking` giữ nguyên (EntityRef snapshot bảo toàn lịch sử).

### Vai trò HDV trong hệ thống

```
role = 'viewer'            → không tạo/sửa/xóa bất kỳ record nào
settlementRole = 'guide'   → có thể submit quyết toán
status = 'active'/'inactive'
```

HDV không thể tạo dữ liệu rác vì `viewer` role không có quyền create.

---

## Quản lý vòng đời dữ liệu

### HDV nghỉ việc

1. Admin set `status = 'inactive'` → HDV không đăng nhập được
2. Lịch sử tour không bị ảnh hưởng (`nameAtBooking` đã snapshot)
3. `is_default_guide = false` tự động nếu là mặc định
4. App cảnh báo admin nếu HDV có tour đang ở trạng thái `submitted` / `need_changes`
5. `guide_id` trong tour giữ nguyên (trỏ vào user_profiles.id đã inactive) — vẫn hiển thị tên từ `nameAtBooking`

### Dữ liệu lịch sử trong quyết toán

- `submissionHistory[].actorId` → lưu user ID → tra cứu `user_profiles` để lấy tên
- Nếu user bị xóa cứng (không nên xảy ra): hiển thị "Người dùng đã xóa"
- **Nguyên tắc:** Không xóa cứng User, chỉ set `status = 'inactive'`

---

## Tài khoản ngân hàng

Kế toán sau khi duyệt quyết toán cần thông tin TK ngân hàng của HDV để chuyển tiền.

**Schema `user_bank_accounts`:**
```sql
CREATE TABLE user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  branch TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_number)
);
```

**Phân quyền:**
- HDV tự thêm/sửa/xóa TK ngân hàng của mình
- Kế toán xem TK ngân hàng (readonly) sau khi approve quyết toán
- Admin xem tất cả

---

## Auth với 300 users

### Hiện trạng
Chỉ có email/password login. Admin tạo từng tài khoản thủ công.

### Cần thêm (theo độ ưu tiên)

| Feature | Ưu tiên | Ghi chú |
|---|---|---|
| Quên mật khẩu | **Bắt buộc** | `supabase.auth.resetPasswordForEmail()` |
| Đổi mật khẩu | Cao | Form trong trang profile |
| Invite user qua email | Cao | Thay vì tạo thủ công, admin invite → HDV tự đặt mật khẩu |
| Đăng nhập Google | Trung bình | Cần xử lý case user mới chưa có user_profiles |

### Invite flow (scale 300 users)

```
1. Admin tạo user_profiles record (email, role=viewer, settlementRole=guide)
2. Admin click "Gửi lời mời" → supabase.auth.admin.inviteUserByEmail(email)
3. HDV nhận email → click link → tự đặt mật khẩu → đăng nhập
```

Không cần admin biết/quản lý mật khẩu của từng HDV.

---

## Quản lý dung lượng ảnh

**Quy mô ước tính:** 300 HDV × 100 tours/năm × 20 ảnh/tour = 600,000 ảnh/năm

| Kịch bản | Size/ảnh | Tổng/năm |
|---|---|---|
| Không nén (hiện tại, max 5MB) | ~4MB | ~2.4TB ❌ |
| Có nén + giới hạn | ~800KB | ~480GB ✅ |

### Giải pháp

1. **Client-side compression** trước khi upload → target ≤ 800KB/ảnh
   - Thư viện: `browser-image-compression`
   - Resize về max 1920px, quality 80%

2. **Giới hạn 30 ảnh/tour** — hiển thị badge "X/30 ảnh"

3. **Supabase Storage** bucket policy: max 10MB input (sau nén sẽ < 1MB thực tế)

### Hiện trạng code

`TourImagesTab.tsx:163` — có giới hạn 5MB/ảnh nhưng chưa nén và chưa giới hạn số lượng.

---

## Scale database (30,000 tours/năm)

- 30,000 tours × 20 sub-rows bình quân = 600,000 rows trong các bảng con
- PostgreSQL xử lý tốt ở quy mô này, không cần sharding
- Index cần có: `tours.guide_id`, `tours.created_at`, `tours.status`
- Pagination đã implement → không lo performance

### Supabase RLS (nâng cao, khi cần)

```sql
-- Guide chỉ SELECT được tour của mình
CREATE POLICY "guides_see_own_tours" ON tours
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = guide_id)
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );
```

Hiện tại filter ở tầng app đủ dùng. RLS thêm vào khi cần bảo mật tuyệt đối.

---

## Migration từ hệ thống cũ

```
Với mỗi Guide record hiện tại:
1. Admin tạo User account (email HDV, role=viewer, settlementRole=guide)
2. Điền phone, guide_note, is_default_guide, guide_card_id vào user_profiles
3. Script: migrate guide_languages → user_languages (theo user_id mới)
4. Script: UPDATE tours SET guide_id = new_user_id WHERE guide_id = old_guide_id
5. Verify → DROP guide_languages; DROP guides;
```

**Rủi ro migration:** Tours đang có `guide_id = old_guide_uuid` sẽ bị broken nếu update FK không đúng. Phải chạy trong transaction và verify trước khi commit.

---

## Tóm tắt files cần thay đổi

| File | Action |
|---|---|
| Supabase migration SQL | Tạo mới (các ALTER TABLE và CREATE TABLE) |
| `src/types/user.ts` | Thêm guide fields, BankAccount types |
| `src/types/master.ts` | Xóa Guide, GuideInput |
| `src/integrations/supabase/types.ts` | Cập nhật schema types |
| `src/lib/datastore/modules/mappers.ts` | Xóa mapGuide, cập nhật mapUserProfile |
| `src/lib/datastore/modules/master-data.ts` | Xóa guide methods, thêm listGuideUsers, updateUserLanguages |
| `src/lib/datastore/modules/tour-operations.ts` | Auto-filter tour cho guide user |
| `src/lib/datastore/supabase-store.ts` | Expose bank account CRUD |
| `src/pages/Guides.tsx` | Xóa |
| `src/components/guides/` | Xóa toàn bộ |
| `src/pages/Users.tsx` | Thêm guide fields + bank accounts section |
| `src/components/users/BankAccountList.tsx` | Tạo mới |
| `src/components/users/BankAccountDialog.tsx` | Tạo mới |
| `src/components/tours/TourInfoForm.tsx` | Đổi guide dropdown sang listGuideUsers |
| `src/pages/Auth.tsx` | Thêm link quên mật khẩu |
| `src/pages/ResetPassword.tsx` | Tạo mới |
| `src/App.tsx` | Xóa route /guides, thêm /reset-password |
| `src/components/tours/TourImagesTab.tsx` | Compression + giới hạn 30 ảnh |
| `package.json` | Thêm browser-image-compression |
