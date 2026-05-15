# Features Of App

Tài liệu này tóm tắt các nhóm tính năng chính của app quản lý tour.

## Quản lý tour

- Tạo, xem, sửa, xoá và duplicate tour.
- Quản lý thông tin cơ bản của tour như mã tour, ngày bắt đầu, số ngày, công ty, hướng dẫn viên, quốc tịch, số khách và ghi chú.
- Tìm kiếm, lọc, phân trang và xem danh sách tour.
- Xem chi tiết tour theo từng tab nghiệp vụ.
- Tính toán tổng chi phí, tổng thu, các khoản shopping, meal, allowance và summary liên quan đến tour.

## Chi tiết nghiệp vụ trong tour

- Quản lý lịch trình điểm đến theo ngày.
- Quản lý chi phí tour theo ngày, loại chi phí, số lượng khách và số tiền.
- Quản lý meal và allowance theo ngày.
- Quản lý shopping trong tour, gồm tiền mua sắm, tip và thông tin liên quan.
- Quản lý hình ảnh tour thông qua Supabase Storage và bảng `tour_images`.

## Master data

- Quản lý công ty.
- Quản lý hướng dẫn viên.
- Quản lý quốc tịch.
- Quản lý tỉnh/thành.
- Quản lý điểm đến du lịch.
- Quản lý điểm shopping.
- Quản lý nhóm chi phí và chi phí chi tiết.
- Quản lý diary type và tour diary.
- Quản lý restaurant, shop place và hotel theo tỉnh/thành.

## Import, export và backup

- Import tour từ Excel.
- Import hàng loạt master data.
- Export từng tour ra Excel.
- Export toàn bộ tour ra một file Excel.
- Export tour theo tháng thành ZIP.
- Export thông tin tour ra text.
- Tạo SQL backup đầy đủ từ dữ liệu Supabase.
- Tải toàn bộ ảnh tour thành ZIP theo thư mục tour.

## Thống kê

- Có màn hình Statistics để tổng hợp dữ liệu tour.
- Dữ liệu thống kê dùng React Query cache và có cơ chế invalidate/refetch khi dữ liệu tour thay đổi.
- Các helper tính toán summary nằm trong `src/lib/tour-utils.ts`.

## User, auth và phân quyền

- Đăng nhập qua Supabase Auth.
- Auth state được quản lý trong `AuthContext`.
- Hồ sơ user lưu ở bảng `user_profiles`.
- Role hiện tại gồm admin, editor và viewer.
- Permission guard giới hạn thao tác theo quyền như tạo, sửa, xoá tour, sửa master data và quản lý user.
- Màn hình Users cho phép admin quản lý hồ sơ user.

## Trải nghiệm sử dụng

- App là SPA nên chuyển màn hình nhanh sau khi đã tải bundle.
- Layout có navigation chính cho tour, master data, thống kê và user.
- Toast hiển thị trạng thái thành công hoặc lỗi khi thao tác.
- PWA giúp app có khả năng cài đặt và cache tài nguyên tĩnh theo cấu hình build.
