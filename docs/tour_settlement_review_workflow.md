# Đề xuất tối ưu luồng quyết toán tour giữa HDV và kế toán

## Bối cảnh hiện tại

Hiện tại HDV nhập thông tin tour, chi phí và các khoản phát sinh, sau đó xuất Excel gửi kế toán kiểm tra. Kế toán kiểm tra trên file, chỉnh sửa hoặc ghi chú rồi xuất lại Excel gửi HDV kiểm tra tiếp.

Luồng này có một số vấn đề:

- Mất thời gian do phải gửi file qua lại nhiều vòng.
- Dễ sai version vì mỗi bên có thể đang xem một file khác nhau.
- Khó biết khoản nào đã được duyệt, khoản nào cần bổ sung.
- Ghi chú thường nằm rải rác trong file hoặc qua tin nhắn, khó theo dõi lịch sử.
- Excel đang bị dùng như nơi làm việc chính, trong khi dữ liệu gốc lại nằm trong app.

## Mục tiêu

Mục tiêu là chuyển việc kiểm tra và phản hồi vào trong app. Excel chỉ nên là file xuất cuối cùng sau khi kế toán đã duyệt.

Kết quả mong muốn:

- HDV và kế toán cùng xem một bộ dữ liệu thống nhất.
- Giảm số lần gửi file thủ công.
- Mỗi khoản chi có trạng thái và ghi chú rõ ràng.
- Có lịch sử chỉnh sửa và lịch sử duyệt.
- Xuất Excel sau cùng theo mẫu chuẩn, hạn chế sai lệch.

## Luồng đề xuất

### 1. HDV lập quyết toán tour

HDV nhập hoặc kiểm tra lại các thông tin:

- Thông tin tour.
- Danh sách khách, số lượng khách, quốc tịch nếu liên quan đến tính chi phí.
- Chi phí cố định.
- Chi phí phát sinh.
- Ghi chú phát sinh.
- Hóa đơn, chứng từ hoặc hình ảnh đính kèm nếu có.

Trong bước này hồ sơ ở trạng thái `Draft`.

### 2. HDV gửi kế toán kiểm tra

Khi hoàn tất, HDV bấm `Gửi kế toán kiểm tra`.

Sau khi gửi:

- Hồ sơ chuyển sang trạng thái `Submitted`.
- App lưu lại version dữ liệu tại thời điểm gửi.
- HDV vẫn xem được hồ sơ nhưng không nên sửa tự do nếu kế toán đang kiểm tra.
- Nếu cần sửa gấp, HDV có thể rút lại hồ sơ hoặc gửi yêu cầu mở khóa, tùy chính sách vận hành.

### 3. Kế toán review trực tiếp trên app

Kế toán mở danh sách tour đang chờ kiểm tra và review từng khoản.

Mỗi dòng chi phí nên có trạng thái riêng:

- `Chưa kiểm tra`
- `Hợp lệ`
- `Cần bổ sung`
- `Không hợp lệ`

Kế toán có thể comment trực tiếp trên từng khoản chi, ví dụ:

- Thiếu hóa đơn.
- Số tiền không khớp.
- Cần giải thích lý do phát sinh.
- Sai nhóm chi phí.
- Cần tách khoản chi thành nhiều dòng.

Nếu toàn bộ hợp lệ, kế toán duyệt hồ sơ. Nếu còn vấn đề, kế toán trả lại HDV.

### 4. HDV xử lý phản hồi

Khi kế toán trả lại, hồ sơ chuyển sang trạng thái `Need Changes`.

HDV chỉ cần tập trung vào các dòng bị đánh dấu `Cần bổ sung` hoặc `Không hợp lệ`.

App nên hiển thị rõ:

- Khoản nào bị phản hồi.
- Ai phản hồi.
- Nội dung phản hồi.
- Thời điểm phản hồi.
- Dữ liệu cũ và dữ liệu mới nếu HDV đã sửa.

Sau khi hoàn tất, HDV gửi lại kế toán. Hồ sơ chuyển sang trạng thái `Resubmitted`.

### 5. Kế toán duyệt cuối

Khi kế toán xác nhận hợp lệ, hồ sơ chuyển sang trạng thái `Approved`.

Sau khi đã duyệt:

- Hồ sơ bị khóa để tránh sửa sau duyệt.
- App cho phép xuất Excel bản cuối.
- File Excel là kết quả chính thức để lưu trữ, gửi nội bộ hoặc nhập vào hệ thống kế toán khác nếu cần.

Nếu công ty có bước thanh toán hoặc hoàn ứng, có thể thêm trạng thái `Paid` hoặc `Closed` sau `Approved`.

## Trạng thái hồ sơ đề xuất

- `Draft`: HDV đang nhập dữ liệu.
- `Submitted`: HDV đã gửi kế toán kiểm tra.
- `Accounting Review`: kế toán đang kiểm tra.
- `Need Changes`: kế toán trả lại, HDV cần bổ sung hoặc sửa.
- `Resubmitted`: HDV đã sửa và gửi lại.
- `Approved`: kế toán đã duyệt.
- `Paid`: đã thanh toán hoặc hoàn ứng.
- `Closed`: hồ sơ đã hoàn tất và đóng.

Với MVP, có thể rút gọn còn:

- `Draft`
- `Submitted`
- `Need Changes`
- `Approved`
- `Closed`

## Quyền thao tác đề xuất

### HDV

- Tạo và chỉnh sửa quyết toán khi hồ sơ ở trạng thái `Draft` hoặc `Need Changes`.
- Gửi hồ sơ cho kế toán.
- Xem phản hồi của kế toán.
- Sửa các khoản bị yêu cầu bổ sung.
- Xem file Excel sau khi được duyệt.

### Kế toán

- Xem danh sách hồ sơ chờ kiểm tra.
- Review từng khoản chi.
- Comment trên từng khoản.
- Trả hồ sơ về HDV.
- Duyệt hồ sơ.
- Xuất Excel bản cuối.

### Admin hoặc quản lý

- Xem toàn bộ hồ sơ.
- Mở khóa hồ sơ đã duyệt trong trường hợp đặc biệt.
- Xem lịch sử chỉnh sửa.
- Cấu hình ngưỡng yêu cầu chứng từ.
- Cấu hình mẫu Excel xuất cuối.

## Tính năng nên có

### Review theo từng dòng chi phí

Không nên chỉ comment chung cho cả tour. Mỗi khoản chi cần có trạng thái và ghi chú riêng để HDV biết chính xác cần sửa gì.

### Lịch sử chỉnh sửa

App nên lưu lại:

- Ai sửa.
- Sửa lúc nào.
- Sửa trường nào.
- Giá trị cũ.
- Giá trị mới.
- Lý do sửa nếu hồ sơ đã từng được gửi kế toán.

### So sánh version

Khi HDV gửi lại sau khi bị trả về, kế toán nên thấy rõ những thay đổi so với lần gửi trước.

Ví dụ:

- Khoản chi mới được thêm.
- Số tiền đã thay đổi.
- Ghi chú đã được bổ sung.
- Hóa đơn đã được đính kèm.

### Điều kiện bắt buộc trước khi gửi

Trước khi HDV gửi kế toán, app nên kiểm tra:

- Có đầy đủ thông tin tour.
- Các khoản chi có nhóm chi phí.
- Các khoản phát sinh có lý do.
- Khoản chi vượt ngưỡng phải có chứng từ.
- Tổng tiền không bị âm bất thường.
- Các trường bắt buộc không bị bỏ trống.

### Dashboard cho kế toán

Kế toán cần màn hình tổng hợp:

- Hồ sơ mới gửi.
- Hồ sơ đang review.
- Hồ sơ đã trả về HDV.
- Hồ sơ HDV đã gửi lại.
- Hồ sơ đã duyệt.
- Hồ sơ quá hạn kiểm tra.

### Thông báo

Nên có thông báo trong app hoặc qua email/Zalo tùy hạ tầng hiện tại:

- HDV gửi hồ sơ mới.
- Kế toán trả hồ sơ.
- HDV gửi lại.
- Kế toán duyệt hồ sơ.

### Xuất Excel bản cuối

Excel vẫn cần giữ vì kế toán có thể cần lưu trữ hoặc gửi cho bên khác.

Tuy nhiên, Excel chỉ nên được xuất sau khi hồ sơ đã `Approved`, hoặc nếu cho phép xuất trước duyệt thì cần watermark rõ là bản nháp.

## MVP đề xuất

Nên triển khai trước các phần có tác động lớn nhất:

1. Thêm trạng thái quyết toán tour.
2. Cho HDV gửi quyết toán từ `Draft` sang `Submitted`.
3. Cho kế toán review từng dòng chi phí.
4. Cho kế toán comment và trả hồ sơ về HDV.
5. Cho HDV sửa và gửi lại.
6. Cho kế toán duyệt cuối.
7. Chỉ xuất Excel bản chính thức sau khi được duyệt.

MVP này đã đủ để giảm vòng gửi Excel qua lại và giảm lỗi version.

## Giai đoạn sau MVP

Sau khi MVP chạy ổn, có thể bổ sung:

- Lịch sử chỉnh sửa chi tiết.
- So sánh version giữa các lần gửi.
- Thông báo tự động.
- Cấu hình ngưỡng bắt buộc chứng từ.
- Phân quyền nâng cao theo vai trò.
- Báo cáo thời gian xử lý của kế toán và HDV.
- Tích hợp lưu file chứng từ.
- Tự động tạo mã quyết toán.
- Chốt kỳ kế toán theo tháng.

## Nguyên tắc vận hành

- Dữ liệu trong app là dữ liệu gốc.
- Excel là bản xuất ra, không phải nơi chỉnh sửa chính.
- Mọi phản hồi phải gắn với dòng dữ liệu cụ thể.
- Hồ sơ đã duyệt phải bị khóa.
- Nếu cần sửa sau duyệt, phải có quyền đặc biệt và lưu lịch sử.
- Mỗi lần gửi kế toán cần lưu version để truy vết.

## Rủi ro cần lưu ý

### Thay đổi thói quen làm việc

HDV và kế toán đang quen xử lý bằng Excel. Khi chuyển sang review trong app, cần làm giao diện đủ rõ và nhanh, nếu không người dùng sẽ quay lại cách cũ.

### Thiếu chứng từ

Nếu không quy định rõ khoản nào bắt buộc chứng từ, kế toán vẫn phải hỏi lại thủ công. Nên có rule theo số tiền hoặc nhóm chi phí.

### Sửa sau duyệt

Nếu cho sửa hồ sơ đã duyệt mà không lưu lịch sử, dữ liệu kế toán có thể bị lệch. Cần khóa hồ sơ sau duyệt và chỉ admin hoặc quản lý được mở lại.

### Excel vẫn cần đúng mẫu

Dù không dùng Excel để review qua lại, file xuất cuối vẫn phải đúng format kế toán đang cần. Vì vậy mẫu Excel nên được giữ ổn định và kiểm tra kỹ.

## Kết luận

Giải pháp phù hợp là biến app thành nơi nhập, review, phản hồi và duyệt quyết toán. Excel chỉ còn là file đầu ra sau khi dữ liệu đã được thống nhất.

Luồng này giúp giảm thời gian xử lý, giảm sai version, giảm trao đổi thủ công và tạo được lịch sử rõ ràng giữa HDV với kế toán.
