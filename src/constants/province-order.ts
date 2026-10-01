import type { QuickAddGroupView } from '@/types/quick-add';

/** Thứ tự tỉnh theo tuyến tour miền Trung (nam → bắc), dùng khi nhóm điểm đến theo tỉnh. */
export const DESTINATION_PROVINCE_ORDER = ['Quảng Nam', 'Đà Nẵng', 'Huế', 'Quảng Trị', 'Quảng Bình'];

/** Mặc định của danh sách điểm đến thông dụng: 2 điểm mỗi tỉnh, ẩn hai tỉnh ít đi. */
export const DESTINATION_QUICK_ADD_DEFAULT_VIEW: QuickAddGroupView = {
  limit: 2,
  hidden: ['Quảng Trị', 'Quảng Bình'],
};
