# Architechure Of App

Tên file này giữ nguyên là `architechure_of_app.md` theo yêu cầu, dù từ "architecture" bị viết sai chính tả.

## Tổng quan

App là frontend SPA xây bằng Vite, React và TypeScript. Ứng dụng chạy hoàn toàn ở phía browser, kết nối trực tiếp tới Supabase để xử lý auth, database và storage. Backend custom riêng chưa xuất hiện trong repo; business logic chủ yếu nằm trong React pages, components và lớp data store.

## App shell và routing

Điểm vào chính là `src/main.tsx`, render React app vào DOM. `src/App.tsx` bọc app bằng `QueryClientProvider`, `AuthProvider`, `TooltipProvider`, toaster và `HashRouter`.

Routing dùng `react-router-dom` với các route chính cho auth, tours, tour detail, guides, companies, nationalities, provinces, destinations, shopping, expense categories, detailed expenses, statistics và users. Các route nghiệp vụ yêu cầu user đã đăng nhập; nếu chưa đăng nhập sẽ điều hướng về trang auth.

## Auth và permission layer

Supabase Auth quản lý session người dùng. `AuthContext` đọc session ban đầu, lắng nghe thay đổi auth state và tải user profile từ data store. User profile chứa role và status để xác định quyền.

Phân quyền được gom trong `src/types/user.ts` và các helper trong `src/components/auth/PermissionGuard.tsx`. Component có thể bọc UI bằng guard để chỉ admin, editor hoặc role có permission phù hợp mới thao tác được.

## Data access layer

App định nghĩa interface `DataStore` trong `src/types/datastore.ts`. Implementation hiện tại là `SupabaseStore` trong `src/lib/datastore/supabase-store.ts`.

`src/lib/datastore/index.ts` tạo singleton store để các page và component dùng chung. Cách này giúp UI gọi các method nghiệp vụ như list, create, update, duplicate, delete, bulk import, import data và export data mà không cần biết chi tiết truy vấn Supabase.

Supabase client được cấu hình trong `src/integrations/supabase/client.ts` và được bọc thêm bởi `src/lib/datastore/supabase-client.ts`. Các biến môi trường Vite như Supabase URL và publishable key quyết định client có sẵn sàng hoạt động hay không.

## Server state và cache

React Query là lớp cache chính cho dữ liệu lấy từ Supabase. Các page dùng `useQuery` để đọc dữ liệu và `useMutation` để thay đổi dữ liệu. Sau mutation, app invalidate query key liên quan để đồng bộ lại UI.

Các cache key quan trọng xuất hiện quanh tours, tour detail, master data, statistics và user profiles. Helper trong `src/lib/query-cache.ts` gom logic invalidate các cache tổng hợp của tour để tránh thiếu refresh sau khi sửa chi tiết tour.

## UI structure

Các page nằm trong `src/pages/`, ví dụ Tours, TourDetail, Statistics, Guides, Companies và Users. Component tái sử dụng nằm trong `src/components/`, chia theo domain như tours, companies, guides, shopping, detailed-expenses, users và thư viện UI chung trong `src/components/ui/`.

Các type nghiệp vụ nằm trong `src/types/`, chia thành tour, master, datastore và user. Các helper nghiệp vụ nằm trong `src/lib/`, ví dụ tính summary tour, format currency, format date, export Excel, SQL backup, xử lý lỗi và search keyword.

## Database và storage

Supabase database được version bằng SQL migration trong `supabase/migrations/`. Các migration tạo và cập nhật bảng như tours, tour destinations, expenses, meals, allowances, tour shoppings, master data, user profiles, tour images, tour diaries, restaurants, shop places và hotels.

Supabase Storage dùng bucket `tour-images` để lưu ảnh tour. Metadata ảnh được lưu trong bảng `tour_images`, còn file thực tế nằm trong storage path theo tour.

## Import, export và background scripts

Import/export tour được xử lý ở frontend qua các helper trong `src/lib/`. Excel export/import dùng exceljs và xlsx, ZIP export dùng jszip, còn SQL backup đọc dữ liệu từ Supabase và tạo file SQL để tải xuống.

Thư mục `scripts/` chứa các script Node.js chạy ngoài UI, ví dụ backfill total days và upload/check/remove duplicate tour images. Các script này dùng Supabase client và biến môi trường local.

## PWA và deployment output

Vite config có plugin PWA với `autoUpdate`, manifest và workbox. Build production tạo static assets trong `dist/`, phù hợp để deploy như static frontend. PWA chủ yếu cache tài nguyên tĩnh và giúp app có trải nghiệm cài đặt tốt hơn trên browser hỗ trợ.

## Luồng dữ liệu điển hình

Người dùng đăng nhập qua Supabase Auth. App tải profile để xác định role và permission. Page gọi React Query, query function gọi `store`, `store` gọi `SupabaseStore`, `SupabaseStore` truy vấn Supabase database hoặc storage. Khi người dùng tạo, sửa hoặc xoá dữ liệu, mutation cập nhật Supabase rồi invalidate cache để UI đọc lại dữ liệu mới.
