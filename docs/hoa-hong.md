# Luồng hoa hồng mua sắm

Cập nhật: 2026-06-16

Tài liệu này mô tả luồng quản lý hoa hồng từ các mục mua sắm trong tour. Hoa hồng mua sắm được lưu theo từng dòng `tour_shoppings`, còn các lần đã nhận hoa hồng được lưu trong `shopping_commission_payments`.

## Mục đích

Luồng hoa hồng theo dõi số tiền hoa hồng kỳ vọng, thuế/TNCN bị giữ lại nếu có, số tiền thực nhận, các lần đã nhận và cảnh báo còn thiếu hoa hồng trên tour.

Đây không phải là thanh toán tour cho HDV. Thanh toán tour dùng bảng `tour_payments`; hoa hồng mua sắm dùng bảng `shopping_commission_payments`.

## Các file chính

- `src/components/tours/ShoppingsTab.tsx`: tab mua sắm và wiring các thao tác hoa hồng.
- `src/components/tours/ShoppingDesktopTable.tsx`: bảng desktop hiện hoa hồng, thuế, thực nhận, trạng thái và form thêm khoản nhận.
- `src/components/tours/mobile/ShoppingsMobileList.tsx`: danh sách mobile với cùng luồng nhận hoa hồng.
- `src/hooks/useShoppingCommissionMutations.ts`: mutation thêm/xóa/xóa hết khoản nhận hoa hồng, cập nhật cache lạc quan.
- `src/lib/shopping-commission-utils.ts`: tính thực nhận, đã nhận, còn lại, trạng thái và warning.
- `src/lib/datastore/modules/tour-operations/tour-items.ts`: tạo/sửa/xóa dòng mua sắm.
- `src/lib/datastore/modules/tour-operations/tour-payments.ts`: `listCommissionPayments`, `addCommissionPayment`, `deleteCommissionPayment`.
- `src/lib/datastore/modules/payment-mappers.ts`: map `tour_shoppings` kèm `shopping_commission_payments` và tính `commissionStatus`.
- `supabase/migrations/20260523170200_create_shopping_commission_payments.sql`: bảng lưu các lần nhận hoa hồng.
- `supabase/migrations/20260523171000_validate_shopping_commission_payment_total.sql`: validate không nhận vượt thực nhận.
- `supabase/migrations/20260614120000_sync_unpaid_commission_warning.sql`: trigger đồng bộ cờ `has_unpaid_commission` trên tour.

## Dữ liệu liên quan

Bảng `tour_shoppings` lưu dòng mua sắm:

- `name`: tên mục mua sắm.
- `price`: hoa hồng/giá trị hoa hồng gốc.
- `date`: ngày phát sinh.
- `withholds_pit`: có giữ thuế TNCN hay không.
- `pit_rate`: tỷ lệ thuế nếu có.
- `pit_amount`: số tiền thuế bị giữ.
- `net_commission`: hoa hồng thực nhận nếu được tính/sửa trực tiếp.

Bảng `shopping_commission_payments` lưu các lần đã nhận:

- `tour_shopping_id`: dòng mua sắm cha.
- `amount`: số tiền đã nhận, bắt buộc lớn hơn 0.
- `payment_method`: `cash` hoặc `bank_transfer`.
- `paid_at`: ngày nhận.
- `note`: ghi chú tùy chọn.
- `created_at`, `updated_at`: audit timestamp.

Bảng `tours` có `has_unpaid_commission` để đánh dấu tour còn ít nhất một dòng mua sắm chưa nhận đủ hoa hồng.

## Cách tính số tiền và trạng thái

Helper UI tính:

- `netCommission = shopping.netCommission` nếu có.
- Nếu không có `netCommission`, `netCommission = max(0, shopping.price - shopping.pitAmount)`.
- `paidTotal = tổng amount trong shopping.payments`.
- `remaining = max(0, netCommission - paidTotal)`.

Trạng thái hoa hồng:

- `pending`: chưa có payment nào.
- `partial`: đã có payment nhưng tổng đã nhận nhỏ hơn thực nhận.
- `paid`: tổng đã nhận lớn hơn hoặc bằng thực nhận.

Label hiện trên UI:

- `pending`: "Chưa nhận".
- `partial`: "Một phần".
- `paid`: "Đã nhận đủ".

## Luồng tạo/sửa dòng mua sắm

1. Người dùng thêm hoặc sửa dòng trong tab mua sắm.
2. Datastore kiểm tra quyền thao tác shopping của tour.
3. Khi thêm, `store.addTourShopping` insert vào `tour_shoppings` các trường tên, giá, ngày, thuế và thực nhận.
4. Nếu payload có sẵn danh sách payments, datastore sẽ insert dòng mua sắm trước để có `id`, sau đó gọi `addCommissionPayment` cho từng payment.
5. Sau khi thêm/sửa/xóa mua sắm, datastore gọi `recalculateTourSummary(tourId)`.
6. Khi đọc tour, `getTour` và `listTours` fetch `tour_shoppings(*, shopping_commission_payments(*))`, mapper gắn `payments` và tính `commissionStatus`.

## Luồng ghi nhận đã nhận hoa hồng

Có hai cách trên UI:

- Bấm/checkbox "Nhận đủ": hệ thống tạo một payment bằng số tiền còn lại.
- Mở panel thanh toán của dòng mua sắm và nhập số tiền, hình thức, ngày nhận, ghi chú.

Chi tiết luồng:

1. UI tính `remaining` cho dòng mua sắm.
2. Người dùng chọn phương thức:
   - checkbox "Tiền mặt/TM" bật thì dùng `cash`;
   - mặc định hoặc không bật thì dùng `bank_transfer` trong các thao tác nhanh.
3. Người dùng thêm payment.
4. `useShoppingCommissionMutations.addPaymentMutation` kiểm tra dòng mua sắm phải đã có `id`.
5. UI cập nhật cache lạc quan:
   - thêm payment tạm thời;
   - tính lại `commissionStatus`;
   - tính lại `hasUnpaidCommission` trên tour trong cache.
6. Datastore gọi `store.addCommissionPayment({ ...payment, tourShoppingId })`.
7. DB insert vào `shopping_commission_payments`.
8. Trigger validate tổng số tiền đã nhận không vượt quá hoa hồng thực nhận.
9. Trigger đồng bộ lại `tours.has_unpaid_commission`.
10. UI thay payment tạm thời bằng payment DB trả về, invalidate query và hiện toast thành công.

## Luồng xóa khoản nhận hoa hồng

1. Người dùng mở panel payment của dòng mua sắm.
2. Bấm xóa trên một payment.
3. UI xóa payment khỏi cache lạc quan và tính lại trạng thái.
4. Datastore gọi `store.deleteCommissionPayment(id)`.
5. DB xóa dòng trong `shopping_commission_payments`.
6. Trigger đồng bộ lại `has_unpaid_commission`.
7. Nếu lỗi, UI khôi phục cache snapshot.

## Luồng bỏ ghi nhận "Nhận đủ"

Khi dòng mua sắm đang đã nhận đủ và người dùng bỏ checkbox:

1. `clearPaymentsMutation` lấy tất cả `id` trong `shopping.payments`.
2. Datastore gọi `store.deleteCommissionPayment(id)` cho từng dòng.
3. UI đặt `payments = []` trong cache và tính lại `commissionStatus = pending`.
4. Trigger DB cập nhật lại `has_unpaid_commission` nếu dòng mua sắm vẫn có hoa hồng thực nhận lớn hơn 0.

## Validate DB

DB có hai lớp chặn lỗi:

- `shopping_commission_payments_amount_positive`: `amount > 0`.
- `validate_shopping_commission_payment_total`: trước insert/update payment, tính `expected_net = COALESCE(net_commission, price - pit_amount, price, 0)` và chặn nếu tổng đã nhận sau khi lưu vượt quá `expected_net`.
- `validate_tour_shopping_commission_not_below_paid`: trước khi sửa `price`, `pit_amount`, `net_commission` trên `tour_shoppings`, chặn nếu giá trị thực nhận mới nhỏ hơn tổng payment đã nhận.

Nhờ các trigger này, UI có thể cập nhật nhanh bằng cache lạc quan nhưng DB vẫn giữ ràng buộc tổng nhận không vượt thực nhận.

## Đồng bộ cảnh báo còn thiếu hoa hồng

Function `refresh_tour_unpaid_commission_warning(tourId)` set `tours.has_unpaid_commission = true` nếu tồn tại dòng `tour_shoppings` có:

- hoa hồng thực nhận lớn hơn 0;
- tổng đã nhận trong `shopping_commission_payments` nhỏ hơn hoa hồng thực nhận.

Trigger chạy sau:

- insert/update/delete `shopping_commission_payments`;
- insert/update/delete `tour_shoppings` liên quan `tour_id`, `price`, `pit_amount`, `net_commission`.

Khi không còn dòng nào thiếu hoa hồng, `has_unpaid_commission` về `false`.

## Quyền và RLS

RLS hardening dùng:

- `can_view_tour_shopping(tour_shopping_id)`: được select payment hoa hồng nếu user được xem tour cha.
- `can_modify_tour_shopping(tour_shopping_id)`: được insert/update/delete payment hoa hồng nếu user là owner của tour theo helper `is_tour_owner`.

Phía client cũng ẩn các nút sửa/xóa/thêm payment khi tab đang `readOnly`.

## Mối liên hệ với quyết toán và thanh toán tour

- Hoa hồng mua sắm nằm trong dữ liệu tour và có thể tạo cảnh báo `has_unpaid_commission`.
- Trạng thái hoa hồng không cập nhật `tours.payment_status` và không tính vào `tour_payments`.
- Thanh toán tour cho HDV chỉ bật sau khi quyết toán được duyệt; hoa hồng mua sắm là tracker riêng cho từng dòng mua sắm.
