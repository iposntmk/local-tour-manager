import type { Permission } from '@/types/user';

export type TourTabKey =
  | 'info'
  | 'destinations'
  | 'expenses'
  | 'meals'
  | 'combined'
  | 'allowances'
  | 'shoppings'
  | 'images'
  | 'summary';

export type TourInfoFieldKey =
  | 'tourCode'
  | 'companies'
  | 'guide'
  | 'client'
  | 'pax'
  | 'dates'
  | 'driver'
  | 'notes';

export type TourLineFieldKey = 'name' | 'price' | 'date' | 'quantity' | 'evidence';

export type Access = { view: boolean; edit: boolean };
export type HasPermission = (permission: Permission) => boolean;

export const TOUR_TAB_ORDER: TourTabKey[] = [
  'info',
  'destinations',
  'expenses',
  'meals',
  'combined',
  'allowances',
  'shoppings',
  'summary',
  'images',
];

export const TOUR_TAB_TO_ROUTE: Record<TourTabKey, string> = {
  info: 'info',
  destinations: 'destinations',
  expenses: 'expenses',
  meals: 'meals',
  combined: 'combined',
  allowances: 'allowances',
  shoppings: 'shoppings',
  images: 'images',
  summary: 'summary',
};

const TAB_PERMISSIONS: Record<TourTabKey, { view: Permission; edit?: Permission }> = {
  info: { view: 'view_tour_info', edit: 'edit_tour_info' },
  destinations: { view: 'view_tour_destinations', edit: 'edit_tour_destinations' },
  expenses: { view: 'view_tour_expenses', edit: 'edit_tour_expenses' },
  meals: { view: 'view_tour_meals', edit: 'edit_tour_meals' },
  combined: { view: 'view_tour_combined' },
  allowances: { view: 'view_tour_allowances', edit: 'edit_tour_allowances' },
  shoppings: { view: 'view_tour_shoppings', edit: 'edit_tour_shoppings' },
  images: { view: 'view_tour_images' },
  summary: { view: 'view_tour_summary', edit: 'edit_tour_summary' },
};

const INFO_FIELD_PERMISSIONS: Record<TourInfoFieldKey, { view: Permission; edit: Permission }> = {
  tourCode: { view: 'view_tour_info_tour_code', edit: 'edit_tour_info_tour_code' },
  companies: { view: 'view_tour_info_companies', edit: 'edit_tour_info_companies' },
  guide: { view: 'view_tour_info_guide', edit: 'edit_tour_info_guide' },
  client: { view: 'view_tour_info_client', edit: 'edit_tour_info_client' },
  pax: { view: 'view_tour_info_pax', edit: 'edit_tour_info_pax' },
  dates: { view: 'view_tour_info_dates', edit: 'edit_tour_info_dates' },
  driver: { view: 'view_tour_info_driver', edit: 'edit_tour_info_driver' },
  notes: { view: 'view_tour_info_notes', edit: 'edit_tour_info_notes' },
};

const LINE_FIELD_PERMISSIONS: Record<TourLineFieldKey, { view: Permission; edit: Permission }> = {
  name: { view: 'view_tour_line_name', edit: 'edit_tour_line_name' },
  price: { view: 'view_tour_line_price', edit: 'edit_tour_line_price' },
  date: { view: 'view_tour_line_date', edit: 'edit_tour_line_date' },
  quantity: { view: 'view_tour_line_quantity', edit: 'edit_tour_line_quantity' },
  evidence: { view: 'view_tour_line_evidence', edit: 'edit_tour_line_evidence' },
};

export const getTourTabAccess = (
  hasPermission: HasPermission,
  options: { canViewSensitiveShopping: boolean; isNewTour: boolean }
): Record<TourTabKey, Access> => {
  const viewAllTabs = hasPermission('view_tour_all_tabs') || hasPermission('edit_tours');
  const editAllTabs = hasPermission('edit_tours');

  return TOUR_TAB_ORDER.reduce((access, tab) => {
    const permissions = TAB_PERMISSIONS[tab];
    const edit = !!permissions.edit && (editAllTabs || hasPermission(permissions.edit));
    let view = viewAllTabs || hasPermission(permissions.view) || edit;

    if (tab === 'info' && options.isNewTour && hasPermission('create_tours')) {
      view = true;
    }
    if (tab === 'summary' && (hasPermission('review_settlement_line') || hasPermission('approve_settlement'))) {
      view = true;
    }
    if (tab === 'images' && (hasPermission('upload_tour_images') || hasPermission('delete_tour_images'))) {
      view = true;
    }
    if (tab === 'shoppings') {
      view = view && options.canViewSensitiveShopping;
    }

    access[tab] = { view, edit };
    return access;
  }, {} as Record<TourTabKey, Access>);
};

export const getTourInfoFieldAccess = (
  hasPermission: HasPermission,
  infoTabAccess: Access
): Record<TourInfoFieldKey, Access> => {
  const viewAll = hasPermission('view_tour_info_all_fields') || infoTabAccess.edit || hasPermission('edit_tours');
  const editAll = hasPermission('edit_tour_info_all_fields') || infoTabAccess.edit || hasPermission('edit_tours');

  return (Object.keys(INFO_FIELD_PERMISSIONS) as TourInfoFieldKey[]).reduce((access, field) => {
    const permissions = INFO_FIELD_PERMISSIONS[field];
    const edit = editAll || hasPermission(permissions.edit);
    const view = infoTabAccess.view && (viewAll || hasPermission(permissions.view) || edit);
    access[field] = { view, edit: infoTabAccess.view && edit };
    return access;
  }, {} as Record<TourInfoFieldKey, Access>);
};

export const getTourLineFieldAccess = (
  hasPermission: HasPermission
): Record<TourLineFieldKey, Access> => {
  const viewAll = hasPermission('view_tour_line_all_fields') || hasPermission('edit_tours');
  const editAll = hasPermission('edit_tour_line_all_fields') || hasPermission('edit_tours');

  return (Object.keys(LINE_FIELD_PERMISSIONS) as TourLineFieldKey[]).reduce((access, field) => {
    const permissions = LINE_FIELD_PERMISSIONS[field];
    const edit = editAll || hasPermission(permissions.edit);
    access[field] = {
      view: viewAll || hasPermission(permissions.view) || edit,
      edit,
    };
    return access;
  }, {} as Record<TourLineFieldKey, Access>);
};

type LineFieldAccessMap = Partial<Record<TourLineFieldKey, Access>>;

export const canViewTourLineField = (access: LineFieldAccessMap | undefined, field: TourLineFieldKey) =>
  access?.[field]?.view ?? true;

export const canEditTourLineField = (access: LineFieldAccessMap | undefined, field: TourLineFieldKey) =>
  access?.[field]?.edit ?? true;

export const canEditAnyTourLineField = (
  access: LineFieldAccessMap | undefined,
  fields: TourLineFieldKey[] = ['name', 'price', 'date', 'quantity', 'evidence']
) => fields.some((field) => canEditTourLineField(access, field));
