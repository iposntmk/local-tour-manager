import type { Permission } from '@/types/user';

export interface PermissionTreeNode {
  id: string;
  label: string;
  description?: string;
  permission?: Permission;
  children?: PermissionTreeNode[];
}

const masterModule = (
  id: string,
  label: string,
  permissions: {
    view: Permission;
    create: Permission;
    edit: Permission;
    delete: Permission;
    import: Permission;
    export: Permission;
  }
): PermissionTreeNode => ({
  id,
  label,
  children: [
    { id: `${id}.view`, label: 'Xem danh sách', permission: permissions.view },
    { id: `${id}.create`, label: 'Tạo mới', permission: permissions.create },
    { id: `${id}.edit`, label: 'Chỉnh sửa', permission: permissions.edit },
    { id: `${id}.delete`, label: 'Xóa', permission: permissions.delete },
    { id: `${id}.import`, label: 'Import hàng loạt', permission: permissions.import },
    { id: `${id}.export`, label: 'Export TXT', permission: permissions.export },
  ],
});

export const PERMISSION_TREE: PermissionTreeNode[] = [
  {
    id: 'tours',
    label: 'Tour',
    children: [
      { id: 'tours.view', label: 'Xem danh sách và chi tiết tour', permission: 'view_tours' },
      { id: 'tours.create', label: 'Tạo tour', permission: 'create_tours' },
      { id: 'tours.edit', label: 'Sửa tour tổng quát', permission: 'edit_tours' },
      { id: 'tours.delete', label: 'Xóa tour', permission: 'delete_tours' },
      { id: 'tours.duplicate', label: 'Nhân bản tour', permission: 'duplicate_tours' },
      { id: 'tours.import', label: 'Import tour từ Excel', permission: 'import_tours' },
      { id: 'tours.export', label: 'Export tour ra Excel/ZIP', permission: 'export_tours' },
      { id: 'tours.backup', label: 'Backup SQL', permission: 'backup_data' },
      { id: 'tours.downloadImages', label: 'Tải toàn bộ ảnh tour', permission: 'download_all_tour_images' },
      {
        id: 'tourTabs',
        label: 'Chi tiết trong tour',
        children: [
          { id: 'tourTabs.info', label: 'Sửa thông tin cơ bản', permission: 'edit_tour_info' },
          { id: 'tourTabs.destinations', label: 'Sửa tab điểm đến', permission: 'edit_tour_destinations' },
          { id: 'tourTabs.expenses', label: 'Sửa tab chi phí', permission: 'edit_tour_expenses' },
          { id: 'tourTabs.meals', label: 'Sửa tab bữa ăn', permission: 'edit_tour_meals' },
          { id: 'tourTabs.allowances', label: 'Sửa tab công tác phí', permission: 'edit_tour_allowances' },
          { id: 'tourTabs.shoppings', label: 'Sửa tab mua sắm', permission: 'edit_tour_shoppings' },
          { id: 'tourTabs.summary', label: 'Sửa tab tổng kết', permission: 'edit_tour_summary' },
          { id: 'tourTabs.uploadImages', label: 'Upload ảnh tour', permission: 'upload_tour_images' },
          { id: 'tourTabs.deleteImages', label: 'Xóa ảnh tour', permission: 'delete_tour_images' },
        ],
      },
      {
        id: 'settlement',
        label: 'Quyết toán tour',
        children: [
          { id: 'settlement.submit', label: 'Gửi kế toán kiểm tra', permission: 'submit_settlement' },
          { id: 'settlement.reviewLine', label: 'Review từng dòng chi phí', permission: 'review_settlement_line' },
          { id: 'settlement.approve', label: 'Duyệt/trả hồ sơ quyết toán', permission: 'approve_settlement' },
          { id: 'settlement.reopen', label: 'Mở khóa hồ sơ đã duyệt', permission: 'reopen_settlement' },
        ],
      },
      {
        id: 'payment',
        label: 'Thanh toán tour',
        children: [
          { id: 'payment.mark', label: 'Ghi nhận thanh toán tour', permission: 'mark_tour_paid' },
        ],
      },
    ],
  },
  {
    id: 'masterData',
    label: 'Master data',
    children: [
      { id: 'masterData.view', label: 'Xem nhóm master data', permission: 'view_master_data' },
      { id: 'masterData.edit', label: 'Sửa master data tổng quát', permission: 'edit_master_data' },
      { id: 'masterData.delete', label: 'Xóa master data tổng quát', permission: 'delete_master_data' },
      masterModule('guides', 'Hướng dẫn viên', {
        view: 'view_guides',
        create: 'create_guides',
        edit: 'edit_guides',
        delete: 'delete_guides',
        import: 'import_guides',
        export: 'export_guides',
      }),
      masterModule('languages', 'Ngôn ngữ', {
        view: 'view_languages',
        create: 'create_languages',
        edit: 'edit_languages',
        delete: 'delete_languages',
        import: 'import_languages',
        export: 'export_languages',
      }),
      masterModule('companies', 'Công ty', {
        view: 'view_companies',
        create: 'create_companies',
        edit: 'edit_companies',
        delete: 'delete_companies',
        import: 'import_companies',
        export: 'export_companies',
      }),
      masterModule('nationalities', 'Quốc tịch', {
        view: 'view_nationalities',
        create: 'create_nationalities',
        edit: 'edit_nationalities',
        delete: 'delete_nationalities',
        import: 'import_nationalities',
        export: 'export_nationalities',
      }),
      masterModule('provinces', 'Tỉnh thành', {
        view: 'view_provinces',
        create: 'create_provinces',
        edit: 'edit_provinces',
        delete: 'delete_provinces',
        import: 'import_provinces',
        export: 'export_provinces',
      }),
      masterModule('touristDestinations', 'Điểm đến', {
        view: 'view_tourist_destinations',
        create: 'create_tourist_destinations',
        edit: 'edit_tourist_destinations',
        delete: 'delete_tourist_destinations',
        import: 'import_tourist_destinations',
        export: 'export_tourist_destinations',
      }),
      masterModule('shopping', 'Mua sắm', {
        view: 'view_shopping',
        create: 'create_shopping',
        edit: 'edit_shopping',
        delete: 'delete_shopping',
        import: 'import_shopping',
        export: 'export_shopping',
      }),
      masterModule('expenseCategories', 'Danh mục chi phí', {
        view: 'view_expense_categories',
        create: 'create_expense_categories',
        edit: 'edit_expense_categories',
        delete: 'delete_expense_categories',
        import: 'import_expense_categories',
        export: 'export_expense_categories',
      }),
      masterModule('detailedExpenses', 'Chi phí chi tiết', {
        view: 'view_detailed_expenses',
        create: 'create_detailed_expenses',
        edit: 'edit_detailed_expenses',
        delete: 'delete_detailed_expenses',
        import: 'import_detailed_expenses',
        export: 'export_detailed_expenses',
      }),
    ],
  },
  {
    id: 'statistics',
    label: 'Thống kê',
    children: [
      { id: 'statistics.view', label: 'Xem màn hình thống kê', permission: 'view_statistics' },
    ],
  },
  {
    id: 'users',
    label: 'Người dùng',
    children: [
      { id: 'users.manage', label: 'Truy cập màn hình quản lý user', permission: 'manage_users' },
      { id: 'users.view', label: 'Xem danh sách user', permission: 'view_all_users' },
      { id: 'users.create', label: 'Tạo user', permission: 'create_users' },
      { id: 'users.edit', label: 'Sửa thông tin user', permission: 'edit_users' },
      { id: 'users.delete', label: 'Xóa user', permission: 'delete_users' },
      { id: 'users.role', label: 'Đổi role và phân quyền', permission: 'change_user_roles' },
    ],
  },
];

export function getNodePermissions(node: PermissionTreeNode): Permission[] {
  const own = node.permission ? [node.permission] : [];
  const childPermissions = node.children?.flatMap(getNodePermissions) ?? [];
  return Array.from(new Set([...own, ...childPermissions]));
}
