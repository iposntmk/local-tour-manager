/** Các tab dòng của tour có hỗ trợ danh sách thêm nhanh. */
export type QuickAddLineType = 'destination' | 'expense' | 'meal' | 'allowance';

/** Tên dòng và số tour đã dùng nó — kết quả xếp hạng từ server. */
export interface FrequentTourLine {
  name: string;
  count: number;
}

/** Mục master data mà một lựa chọn thêm nhanh lấy giá từ đó. */
export interface QuickAddSource {
  name: string;
  price: number;
  categoryId?: string;
  /** Nhãn nhóm khi danh sách được chia nhóm (vd. tỉnh của điểm đến). */
  group?: string;
}

/** Phần tối thiểu của một dòng tour mà danh sách thêm nhanh cần đọc. */
export interface QuickAddLine {
  name: string;
  price: number;
  attachments?: unknown[];
}

export interface QuickAddOption {
  key: string;
  source: QuickAddSource;
  count: number;
  /** Vị trí các dòng trùng tên trong bảng hiện tại. */
  lineIndexes: number[];
}

export interface QuickAddGroup {
  name: string;
  options: QuickAddOption[];
  checkedCount: number;
}

/** Tuỳ chọn hiển thị của danh sách chia nhóm, lưu theo từng trình duyệt. */
export interface QuickAddGroupView {
  /** Số mục thông dụng nhất hiện trong mỗi nhóm; `null` là hiện hết. */
  limit: number | null;
  /** Tên các nhóm đang bị ẩn. */
  hidden: string[];
}
