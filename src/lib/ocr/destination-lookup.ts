// Kiểu dữ liệu điểm đến lấy từ DB (tourist_destinations) cấp cho parser OCR.
// Việc khớp tên giờ dùng token/fuzzy (buildMatcher) thay cho so khớp chuỗi con.

export interface DestinationEntry {
  /** Tên hiển thị (giữ nguyên, kể cả tiền tố "vé_"). */
  name: string;
  /** Tên thô/alias lấy từ OCR hoặc file import để khớp về tên hiển thị. */
  rawName?: string;
  /** price <= 0 được coi là "free" nhưng vẫn dùng để khớp. */
  price: number;
}
