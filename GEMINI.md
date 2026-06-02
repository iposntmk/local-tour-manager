# GEMINI.md

Hướng dẫn cho Gemini CLI khi làm việc trong repo này. Nội dung dùng chung với các agent khác — import để tránh trùng lặp (DRY).

@AGENTS.md
@CLAUDE.md

## Quyết định kiến trúc quan trọng (đừng làm hồi quy)

**Hướng dẫn viên (guide) LÀ người dùng — bảng legacy `guides` đã bị bỏ.**

- Guide = `user_profiles` có `role='editor'` + `settlement_role='guide'` (mặc định khi đăng ký bằng Google). Admin đổi role/settlement_role/quyền ở **trang Người dùng** (`UserDialog` + `UserGuideFields` lo phone, note, ngôn ngữ, HDV mặc định).
- `tours.guide_id` FK tới `user_profiles(id)` (migration `20260602100000`), KHÔNG trỏ bảng `guides`.
- Guide selector trong tour **bắt buộc** dùng `store.listGuideUsers()` / `store.getGuideUser()` (đọc `user_profiles`, trả id canonical). KHÔNG dùng `store.listGuides`/`getGuide` cho selector — gửi id legacy sẽ lỗi FK `tours_guide_id_fkey` (23503) khi tạo/sửa tour.
- Các method ghi guide đã bị vô hiệu (ném lỗi); quản lý guide làm ở trang Người dùng. Trang master `Guides.tsx` là roster chỉ-đọc.
- **Không tái sử dụng bảng `guides` / `guide_languages`.** Ngôn ngữ của guide nằm ở `user_languages`.
