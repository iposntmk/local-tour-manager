# Tech Stacks

Tài liệu này mô tả các công nghệ chính đang được dùng trong app quản lý tour.

## Frontend

- Vite là công cụ build và dev server cho ứng dụng frontend.
- React là framework UI chính, tổ chức theo component và page.
- TypeScript được dùng cho type safety ở component, hook, data model, helper và Supabase types.
- React Router DOM dùng `HashRouter` để định tuyến các màn hình trong SPA.
- React Query quản lý server state, cache dữ liệu, loading state, mutation và invalidate cache sau khi thay đổi dữ liệu.

## UI và Styling

- Tailwind CSS là lớp styling chính, dùng utility class trong component.
- shadcn/ui và Radix UI cung cấp các UI primitives như dialog, dropdown, table, tabs, select, popover, toast, alert và form control.
- lucide-react được dùng cho icon.
- sonner và hệ thống toast nội bộ được dùng để hiển thị phản hồi thao tác.
- react-hook-form và zod hỗ trợ form state, validation và schema validation.

## Backend và Data

- Supabase là backend chính cho database, auth và storage.
- `@supabase/supabase-js` là client SDK để truy vấn table, gọi Supabase Auth và thao tác với Supabase Storage.
- Database schema được quản lý bằng các file SQL migration trong `supabase/migrations/`.
- App có lớp `DataStore` và implementation `SupabaseStore` để gom logic truy cập dữ liệu.
- Supabase generated types nằm trong `src/integrations/supabase/types.ts`, giúp code TypeScript biết cấu trúc table.

## Import, Export và File Processing

- exceljs và xlsx hỗ trợ import/export dữ liệu tour qua Excel.
- jszip hỗ trợ export nhiều file theo ZIP, ví dụ export tour theo tháng hoặc tải toàn bộ ảnh tour.
- Các helper trong `src/lib/excel-utils.ts`, `src/lib/text-export.ts` và `src/lib/sql-backup.ts` xử lý xuất Excel, text và SQL backup.
- Fuse.js được dùng cho tìm kiếm mờ ở danh sách tour.

## PWA và Build

- vite-plugin-pwa cấu hình PWA với manifest, service worker và cơ chế auto update.
- Build production tạo output trong `dist/`.
- App có cấu hình path alias `@/` để import từ `src/`.

## Testing và Quality

- Vitest là test runner chính.
- Testing Library và jsdom hỗ trợ test component React.
- ESLint với TypeScript và React Hooks rules kiểm tra chất lượng code.
- TypeScript config được tách thành cấu hình app, node và root project.

## Scripts và Tooling

- npm là package manager chính vì `package-lock.json` là nguồn dependency authoritative.
- Scripts trong `package.json` bao gồm dev, build, lint, test, preview và các job dữ liệu.
- Thư mục `scripts/` chứa script backfill dữ liệu và script xử lý ảnh tour lên Supabase Storage.
