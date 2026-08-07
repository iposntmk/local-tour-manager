# Import tour từ ảnh (OCR) — chỉ lấy tab Thông tin

Ngày: 2026-08-07

## Mục tiêu

1. Luồng "Import tour từ ảnh chương trình (OCR)" chỉ trích xuất dữ liệu cho **tab Thông tin tour**; không lấy điểm tham quan / bữa ăn / công tác phí.
2. Công ty, HDV, quốc tịch phải được **so khớp master data**; chưa khớp thì chặn import và nói rõ lý do.
3. Sửa lỗi **thiếu dữ liệu** ở màn hình review.
4. **Tự động upload ảnh gốc** vào tab Ảnh sau khi import thành công.

## Kiến trúc

Luồng: `ImportTourFromImageDialog` → `useTourImageOcr` → `store.analyzeTourImage` (Edge Function `analyze-tour-image`) → `buildTourImportJson` → `transformImportedTour` → `EnhancedImportReview` → `useTourImport.importToursAsync` → `store.createTour` → `store.uploadTourImage`.

### Tách module OCR

| File | Trách nhiệm |
|---|---|
| `src/lib/ocr/tour-itinerary-rows.ts` (mới) | Dựng `ItineraryRow[]` từ bảng OCR hoặc từ dòng text, xử lý lịch trình vắt qua năm mới |
| `src/lib/ocr/tour-image-parser.ts` | Trích thông tin tour (header); ghi chú và sub-collections trả rỗng |
| `src/lib/ocr/tour-itinerary-builder.ts` (mới) | Bộ dựng điểm/ăn/công tác phí — **giữ nguyên và vẫn có test**, chỉ không được luồng import gọi |

Bật lại việc lấy sub-collection = gọi `buildItinerarySubcollections(analyzeResult, destinations, options, freeDestinations)`.

`useTourImageOcr` bỏ hai truy vấn `listTouristDestinations` / `listDestinationsFree` (chỉ phục vụ matcher điểm) → phân tích nhanh hơn.

### So khớp master data

Giữ `findEntityRef` (khớp tên đã chuẩn hoá → fallback Fuse threshold 0.3) trong `import-tour-transform.ts`.

Kiểm tra tách sang `src/lib/import-review-validation.ts` (hàm thuần):

- `buildValidationWarnings` — cảnh báo hiển thị trên thẻ tour, phân biệt *"OCR không đọc được"* và *"đọc được nhưng chưa khớp master data — chọn hoặc tạo mới"*.
- `validateReviewItems` — lỗi chặn nút Import: thiếu mã tour / tên khách / ngày, **số khách ≤ 0**, chưa chọn công ty / HDV / quốc tịch.

### Sửa lỗi thiếu dữ liệu

| Lỗi | Sửa |
|---|---|
| Tab Info của thẻ review không có ô `adults`, `children`, `driverName`, `clientPhone`, `notes` — OCR trích ra nhưng user không sửa được | Tách `ImportTourInfoFields.tsx`, bổ sung đủ 5 trường + ô Tổng khách chỉ đọc |
| Sửa số khách không cập nhật `totalGuests` (ảnh hưởng paxCount quốc tịch, chi phí nước uống) | `updateTourField` tính lại `totalGuests` khi đổi `adults`/`children` |
| Tour lưu được với 0 khách | `validateReviewItems` chặn |
| Không có ô ghi chú ở màn hình review | Thêm ô Ghi chú nhập tay. Ghi chú **không** tự lấy từ ảnh — parser luôn trả `notes: ''` |
| `createTour` nuốt lỗi ghi dòng chi tiết bằng `console.error` → báo "thành công" cho bản ghi thiếu dữ liệu | Ném `TourSubcollectionError` (`src/lib/datastore/tour-errors.ts`) kèm tour đã tạo; 3 caller giữ tour nhưng cảnh báo |

### Upload ảnh

`ImportTourFromImageDialog.handleConfirm`: upload ảnh cho **mọi** tour trong `result.imported` (trước chỉ `imported[0]`), invalidate `['tourImages', tourId]`, và cảnh báo rõ khi `imported` rỗng (tour trùng mã bị skip nên ảnh chưa đính vào đâu).

## Kiểm chứng

- `npx vitest run` — 80 test pass (3 suite fail thuộc `.opencode/skills/archify`, không liên quan).
- `npx eslint <13 file thay đổi>` — 0 error.
- `npm run build` — thành công.
- `tsc --noEmit` còn lỗi ở `mappers.ts`, `datastore/index.ts`, `tour-crud.ts`, `useTourDetail.ts` — đã đối chiếu HEAD, tất cả có sẵn từ trước.
