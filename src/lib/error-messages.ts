/**
 * Dịch các lỗi kỹ thuật từ Supabase/PostgreSQL sang thông báo tiếng Việt dễ hiểu.
 * Dùng cho mọi toast lỗi để người dùng không thấy chuỗi tiếng Anh thô.
 */

interface ErrorRule {
  match: (msg: string) => boolean;
  message: string;
}

const RULES: ErrorRule[] = [
  {
    // Row-Level Security: tài khoản không đủ quyền ghi theo policy của bảng
    match: (m) => m.includes('row-level security') || m.includes('violates row-level security'),
    message: 'Bạn không có quyền thực hiện thao tác này (chính sách bảo mật dữ liệu chặn). Vui lòng kiểm tra quyền tài khoản hoặc đăng nhập lại.',
  },
  {
    match: (m) => m.includes('unique') || m.includes('duplicate') || m.includes('tour_code'),
    message: 'Dữ liệu bị trùng (ví dụ mã đã tồn tại). Vui lòng dùng giá trị khác.',
  },
  {
    match: (m) => m.includes('foreign key') || m.includes('violates foreign key'),
    message: 'Dữ liệu liên kết không hợp lệ hoặc bản ghi tham chiếu không còn tồn tại.',
  },
  {
    match: (m) => m.includes('not-null') || m.includes('null value in column') || m.includes('violates not-null'),
    message: 'Thiếu thông tin bắt buộc. Vui lòng điền đầy đủ các trường cần thiết.',
  },
  {
    match: (m) => m.includes('permission denied') || m.includes('insufficient_privilege'),
    message: 'Bạn không có quyền thực hiện thao tác này.',
  },
  {
    match: (m) =>
      m.includes('jwt expired') ||
      m.includes('not authenticated') ||
      m.includes('invalid token') ||
      m.includes('auth session missing'),
    message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  },
  {
    match: (m) => m.includes('failed to fetch') || m.includes('network') || m.includes('timeout'),
    message: 'Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền và thử lại.',
  },
];

/**
 * Trả về thông báo tiếng Việt phù hợp cho một lỗi bất kỳ.
 * @param error  Lỗi gốc (Error, chuỗi, hoặc object có .message)
 * @param fallback  Thông báo mặc định khi không khớp luật nào và không có message
 */
export function toVietnameseError(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  const raw =
    typeof error === 'string'
      ? error
      : (error as { message?: string } | null)?.message ?? '';
  const msg = raw.toLowerCase();

  const rule = RULES.find((r) => r.match(msg));
  if (rule) return rule.message;

  return raw || fallback;
}
