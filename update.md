# Các giải pháp cải tiến ứng dụng

## 1. Shell Pattern - App như desktop

### Vấn đề
- Mỗi page đều bọc trong `<Layout>`, khi chuyển route Layout unmount rồi mount lại
- Top menu bar bị tải lại mỗi khi chuyển trang
- Cảm giác như reload, không mượt

### Giải pháp đề xuất: Nested Routes với Outlet

```tsx
// App.tsx
<Route element={<Layout />}>
  <Route path="/" element={<Tours />} />
  <Route path="/users" element={<Users />} />
  <Route path="/guides" element={<Guides />} />
  ...
</Route>
```

```tsx
// Layout.tsx
import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <>
      <TopMenuBar />
      <Outlet />
    </>
  );
};
```

### Lợi ích
- Top menu bar không bị unmount khi chuyển trang
- Giữ nguyên state của các page trước đó
- Mượt mà như app desktop
- Có thể dùng thêm `keep-alive` để cache component

---

## 2. Trigger Supabase Actions qua GitHub Actions

### Vấn đề hiện tại
- Mỗi khi deploy lên GitHub Pages sẽ trigger Supabase actions
- Không kiểm soát được ai trigger
- Có thể bị abuse bởi người lạ

### Các giải pháp thay thế

#### Giải pháp 1: Trigger thủ công từ Supabase Dashboard
- Vào Supabase dashboard > Functions > click chạy thủ công
- Ưu: Đơn giản, không cần code
- Nhược: Phải login Supabase mỗi lần

#### Giải pháp 2: Dùng Supabase Cron (recommended)
- Tạo scheduled function trong Supabase
- Tự chạy theo thời gian định sẵn (ngày/tuần/tháng)
- Ưu: Tự động, không cần can thiệp

```sql
-- Tạo cron job trong Supabase
select cron.schedule('daily-sync', '0 0 * * *', $$
  select net.http_post(
    url:='https://your-project.supabase.co/functions/v1/your-function',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  );
$$);
```

#### Giải pháp 3: Trigger từ client (authenticated)
- Thêm button trong app để admin trigger
- Kiểm tra user role trước khi chạy
- Ưu: Kiểm soát được ai trigger
- Nhược: Cần thêm UI

#### Giải pháp 4: Webhooks có auth
- Thêm secret token vào webhook
- Edge function verify token trước khi chạy
- Ưu: An toàn, có thể giới hạn ai gọi

### Khuyến nghị
Nếu action là đồng bộ data, recalculate, cleanup nên dùng **Giải pháp 2 (Supabase Cron)** hoặc **Giải pháp 3 (trigger từ client)** thay vì qua CI/CD deployment.