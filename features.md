# Tính năng - Local Tour Manager

## Tổng quan

Local Tour Manager là ứng dụng web quản lý tour du lịch dành cho đại lý lữ hành và nhà điều hành tour, hỗ trợ quản lý tour, chi phí, điểm đến và thống kê báo cáo.

---

## Tính năng chính

### 1. Quản lý Tour

- **Tạo/Sửa/Xóa/Nhân bản tour** với đầy đủ thông tin
- **Thông tin tour bao gồm**:
  - Mã tour, ngày bắt đầu/kết thúc
  - Số khách (người lớn/trẻ em)
  - Hướng dẫn viên (HDV), công ty, quốc tịch
  - Lái xe, điện thoại khách, ghi chú
- **Cờ cảnh báo** tự động:
  - Điểm đến trùng lặp
  - Giá vé bằng 0
  - Thiếu chi phí nước uống

### 2. Chi tiết Tour (Tabs)

| Tab | Mô tả |
|-----|-------|
| **Info** | Thông tin cơ bản của tour |
| **Destinations** | Điểm đến với giá vé và số khách |
| **Expenses** | Chi phí chi tiết (nước uống, xe...) |
| **Meals** | Bữa ăn (cơm, ăn nhẹ) |
| **Allowances** | Công tác phí (CTP) theo ngày |
| **Shoppings** | Mua sắm và hoa hồng |
| **Images** | Hình ảnh tour |
| **Summary** | Tổng kết: tạm ứng, tip công ty, thu khách, tổng cộng |

### 3. Quản lý Master Data

| Module | Mô tả |
|--------|-------|
| **Hướng dẫn viên** | Tên, điện thoại, ghi chú, đánh dấu mặc định |
| **Công ty** | Tên, người liên hệ, điện thoại, email, ghi chú |
| **Quốc tịch** | Tên, mã ISO2, emoji |
| **Tỉnh thành** | Tên |
| **Điểm đến** | Tên, giá vé, tỉnh thành |
| **Mua sắm** | Tên, giá |
| **Danh mục chi phí** | Tên |
| **Chi phí chi tiết** | Tên, giá, danh mục |

### 4. Thống kê (Dashboard)

- **KPI Cards**: Tổng tour, tổng khách, allowances, CTP, tip khách, tip công ty, shopping, thu nhập, trung bình tip/ngày
- **Bộ lọc**: HDV, công ty, quốc tịch, tháng
- **Bảng chi tiết**: Theo tour, HDV, công ty, quốc tịch, tháng
- **Bảo vệ PIN**: Yêu cầu PIN để truy cập

### 5. Export/Import Excel

- **Export tour riêng lẻ** (.xlsx)
- **Export tất cả** tour (single sheet)
- **Export theo tháng** (ZIP file)
- **Export nhiều tour** cùng lúc
- **Import tour** từ file Excel

### 6. Backup SQL

- Tạo backup SQL đầy đủ (schema + data)
- Download file .sql

---

## Tính năng bổ sung

- **Tìm kiếm nhanh** với fuzzy search
- **Bảng có thể tùy chỉnh** cột hiển thị
- **Phân trang** danh sách
- **Sắp xếp** theo cột
- **Bộ lọc nâng cao** (mã tour, ngày, công ty, quốc tịch, tháng/năm)
- **Toast notifications** cho các thao tác
- **Định dạng tiền tệ** VND
- **Giao diện responsive** (desktop/mobile)

---

## Stack công nghệ

| Công nghệ | Mục đích |
|-----------|----------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Supabase | Database & Auth |
| TanStack Query | Data fetching |
| shadcn-ui + Radix | UI components |
| Tailwind CSS | Styling |
| Zod + React Hook Form | Form validation |
| ExcelJS + xlsx | Excel export/import |
| JSZip | ZIP generation |
| Recharts | Charts |
| date-fns | Date utilities |
| Fuse.js | Fuzzy search |
| Lucide React | Icons |
| Sonner | Toast notifications |