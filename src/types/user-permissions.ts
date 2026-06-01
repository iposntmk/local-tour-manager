import type { Permission, SettlementRole, UserProfile, UserRole } from '@/types/user';

export const ALL_PERMISSIONS: Permission[] = [
  'view_tours',
  'create_tours',
  'edit_tours',
  'delete_tours',
  'export_tours',
  'import_tours',
  'duplicate_tours',
  'backup_data',
  'download_all_tour_images',
  'view_tour_all_tabs',
  'view_tour_info',
  'view_tour_destinations',
  'view_tour_expenses',
  'view_tour_meals',
  'view_tour_combined',
  'view_tour_allowances',
  'view_tour_shoppings',
  'view_tour_images',
  'view_tour_summary',
  'edit_tour_info',
  'edit_tour_destinations',
  'edit_tour_expenses',
  'edit_tour_meals',
  'edit_tour_allowances',
  'edit_tour_shoppings',
  'edit_tour_summary',
  'view_tour_info_all_fields',
  'edit_tour_info_all_fields',
  'view_tour_info_tour_code',
  'edit_tour_info_tour_code',
  'view_tour_info_companies',
  'edit_tour_info_companies',
  'view_tour_info_guide',
  'edit_tour_info_guide',
  'view_tour_info_client',
  'edit_tour_info_client',
  'view_tour_info_pax',
  'edit_tour_info_pax',
  'view_tour_info_dates',
  'edit_tour_info_dates',
  'view_tour_info_driver',
  'edit_tour_info_driver',
  'view_tour_info_notes',
  'edit_tour_info_notes',
  'view_tour_line_all_fields',
  'edit_tour_line_all_fields',
  'view_tour_line_name',
  'edit_tour_line_name',
  'view_tour_line_price',
  'edit_tour_line_price',
  'view_tour_line_date',
  'edit_tour_line_date',
  'view_tour_line_quantity',
  'edit_tour_line_quantity',
  'view_tour_line_evidence',
  'edit_tour_line_evidence',
  'upload_tour_images',
  'delete_tour_images',
  'view_master_data',
  'edit_master_data',
  'delete_master_data',
  'view_guides',
  'create_guides',
  'edit_guides',
  'delete_guides',
  'import_guides',
  'export_guides',
  'view_languages',
  'create_languages',
  'edit_languages',
  'delete_languages',
  'import_languages',
  'export_languages',
  'view_companies',
  'create_companies',
  'edit_companies',
  'delete_companies',
  'import_companies',
  'export_companies',
  'view_nationalities',
  'create_nationalities',
  'edit_nationalities',
  'delete_nationalities',
  'import_nationalities',
  'export_nationalities',
  'view_provinces',
  'create_provinces',
  'edit_provinces',
  'delete_provinces',
  'import_provinces',
  'export_provinces',
  'view_tourist_destinations',
  'create_tourist_destinations',
  'edit_tourist_destinations',
  'delete_tourist_destinations',
  'import_tourist_destinations',
  'export_tourist_destinations',
  'view_shopping',
  'create_shopping',
  'edit_shopping',
  'delete_shopping',
  'import_shopping',
  'export_shopping',
  'view_expense_categories',
  'create_expense_categories',
  'edit_expense_categories',
  'delete_expense_categories',
  'import_expense_categories',
  'export_expense_categories',
  'view_detailed_expenses',
  'create_detailed_expenses',
  'edit_detailed_expenses',
  'delete_detailed_expenses',
  'import_detailed_expenses',
  'export_detailed_expenses',
  'view_statistics',
  'manage_users',
  'view_all_users',
  'create_users',
  'edit_users',
  'delete_users',
  'change_user_roles',
  'submit_settlement',
  'review_settlement_line',
  'approve_settlement',
  'reopen_settlement',
  'mark_tour_paid',
];

const EDITOR_MASTER_PERMISSIONS: Permission[] = [
  'view_master_data',
  'edit_master_data',
  'view_guides',
  'create_guides',
  'edit_guides',
  'import_guides',
  'export_guides',
  'view_languages',
  'create_languages',
  'edit_languages',
  'import_languages',
  'export_languages',
  'view_companies',
  'create_companies',
  'edit_companies',
  'import_companies',
  'export_companies',
  'view_nationalities',
  'create_nationalities',
  'edit_nationalities',
  'import_nationalities',
  'export_nationalities',
  'view_provinces',
  'create_provinces',
  'edit_provinces',
  'import_provinces',
  'export_provinces',
  'view_tourist_destinations',
  'create_tourist_destinations',
  'edit_tourist_destinations',
  'import_tourist_destinations',
  'export_tourist_destinations',
  'view_shopping',
  'create_shopping',
  'edit_shopping',
  'import_shopping',
  'export_shopping',
  'view_expense_categories',
  'create_expense_categories',
  'edit_expense_categories',
  'import_expense_categories',
  'export_expense_categories',
  'view_detailed_expenses',
  'create_detailed_expenses',
  'edit_detailed_expenses',
  'import_detailed_expenses',
  'export_detailed_expenses',
];

const VIEWER_MASTER_PERMISSIONS: Permission[] = [
  'view_master_data',
  'view_guides',
  'view_languages',
  'view_companies',
  'view_nationalities',
  'view_provinces',
  'view_tourist_destinations',
  'view_shopping',
  'view_expense_categories',
  'view_detailed_expenses',
];

const TOUR_TAB_VIEW_PERMISSIONS: Permission[] = [
  'view_tour_all_tabs',
  'view_tour_info',
  'view_tour_destinations',
  'view_tour_expenses',
  'view_tour_meals',
  'view_tour_combined',
  'view_tour_allowances',
  'view_tour_shoppings',
  'view_tour_images',
  'view_tour_summary',
];

const TOUR_FIELD_VIEW_PERMISSIONS: Permission[] = [
  'view_tour_info_all_fields',
  'view_tour_info_tour_code',
  'view_tour_info_companies',
  'view_tour_info_guide',
  'view_tour_info_client',
  'view_tour_info_pax',
  'view_tour_info_dates',
  'view_tour_info_driver',
  'view_tour_info_notes',
  'view_tour_line_all_fields',
  'view_tour_line_name',
  'view_tour_line_price',
  'view_tour_line_date',
  'view_tour_line_quantity',
  'view_tour_line_evidence',
];

const TOUR_FIELD_EDIT_PERMISSIONS: Permission[] = [
  'edit_tour_info_all_fields',
  'edit_tour_info_tour_code',
  'edit_tour_info_companies',
  'edit_tour_info_guide',
  'edit_tour_info_client',
  'edit_tour_info_pax',
  'edit_tour_info_dates',
  'edit_tour_info_driver',
  'edit_tour_info_notes',
  'edit_tour_line_all_fields',
  'edit_tour_line_name',
  'edit_tour_line_price',
  'edit_tour_line_date',
  'edit_tour_line_quantity',
  'edit_tour_line_evidence',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS,
  editor: [
    'view_tours',
    'create_tours',
    'edit_tours',
    'export_tours',
    'import_tours',
    'duplicate_tours',
    'export_tours',
    'download_all_tour_images',
    ...TOUR_TAB_VIEW_PERMISSIONS,
    ...TOUR_FIELD_VIEW_PERMISSIONS,
    'edit_tour_info',
    'edit_tour_destinations',
    'edit_tour_expenses',
    'edit_tour_meals',
    'edit_tour_allowances',
    'edit_tour_shoppings',
    'edit_tour_summary',
    ...TOUR_FIELD_EDIT_PERMISSIONS,
    'upload_tour_images',
    'view_statistics',
    ...EDITOR_MASTER_PERMISSIONS,
  ],
  viewer: [
    'view_tours',
    ...TOUR_TAB_VIEW_PERMISSIONS,
    ...TOUR_FIELD_VIEW_PERMISSIONS,
    'view_statistics',
    ...VIEWER_MASTER_PERMISSIONS,
  ],
};

export const SETTLEMENT_ROLE_PERMISSIONS: Record<SettlementRole, Permission[]> = {
  none: [],
  guide: ['submit_settlement', 'view_tour_all_tabs', ...TOUR_TAB_VIEW_PERMISSIONS, ...TOUR_FIELD_VIEW_PERMISSIONS],
  accountant: [
    'review_settlement_line',
    'approve_settlement',
    'view_tour_info',
    'view_tour_summary',
    'view_tour_info_all_fields',
    'view_tour_line_all_fields',
  ],
};

export function normalizePermissions(permissions?: readonly string[] | null): Permission[] {
  if (!permissions) return [];
  const known = new Set(ALL_PERMISSIONS);
  return Array.from(new Set(permissions.filter((permission): permission is Permission => known.has(permission as Permission))));
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function getDefaultPermissionsForProfile(profile: Pick<UserProfile, 'role' | 'settlementRole'>): Permission[] {
  const sys = ROLE_PERMISSIONS[profile.role] ?? [];
  const settle = SETTLEMENT_ROLE_PERMISSIONS[profile.settlementRole] ?? [];
  return Array.from(new Set([...sys, ...settle]));
}

export function getEffectivePermissions(
  profile: Pick<UserProfile, 'role' | 'settlementRole'> & { permissions?: Permission[] | null; email?: string }
): Permission[] {
  if (profile.role === 'admin' || profile.email === 'iposntmk@gmail.com') {
    return ALL_PERMISSIONS;
  }
  if (Array.isArray(profile.permissions)) {
    return normalizePermissions(profile.permissions);
  }
  return getDefaultPermissionsForProfile(profile);
}

export function profileHasPermission(
  profile: Pick<UserProfile, 'role' | 'settlementRole'> & { permissions?: Permission[] | null; email?: string },
  permission: Permission
): boolean {
  return getEffectivePermissions(profile).includes(permission);
}
