# Nguyên nhân trang web tải chậm

## 1. Bundle JS quá lớn — thiếu code splitting

**File:** `src/App.tsx:16-32`

**Vấn đề:** 17 page components đều import tĩnh ở top-level. Không dùng `React.lazy()` hay dynamic `import()`.

```tsx
import Languages from "./pages/Languages";
import Companies from "./pages/Companies";
import Nationalities from "./pages/Nationalities";
// ... 14 pages nữa
```

Toàn bộ code của mọi trang — dù user chỉ cần 1 — được bundle vào initial chunk.

**Thư viện nặng bị kéo vào main bundle do import tĩnh:**

| Thư viện | Import static ở | Ghi chú |
|---|---|---|
| **recharts** (~1MB) | `TopRankChart.tsx`, `MonthlyTrendChart.tsx`, `chart.tsx` | Dùng ở Statistics, nhưng bundle từ đầu |
| **fuse.js** (~20KB gzipped) | `EntitySelector.tsx`, `TourEditForm.tsx`, `useImportTourReview.ts`, `useEnhancedImportReview.ts`, `import-tour-transform.ts`, `import-match-utils.ts` | 6 file static import + `optimizeDeps.include` |
| **jszip** | `TourImagesTab.tsx`, `useTourPageActions.ts` | Dùng ở tour images + export |

**Đúng:** `exceljs` và `xlsx` dùng dynamic import (`await import(...)`), không nằm trong main bundle. Tuy nhiên `exceljs` vẫn có trong `optimizeDeps.include` (`vite.config.ts:101`) gây pre-bundle phí phạm.

---

## 2. `getCurrentUserProfile()` gọi redundant trên mỗi `listTours()`

**File:** `src/lib/datastore/modules/tour-operations/tour-crud.ts:107`

**Vấn đề:** Mỗi lần gọi `listTours()` đều chạy:

1. `supabase.auth.getUser()` — HTTP request đến Supabase Auth
2. `getUserProfile(user.id)` — query `user_profiles` table

AuthContext ở App.tsx đã có sẵn thông tin user. Việc fetch lại trong mỗi `listTours()` không cần thiết và gây chậm.

**Scope:** Ảnh hưởng cả Tours page (list) lẫn các page khác gọi DB operations.

---

## 3. Không phân trang (no pagination) — `listTours` không limit

**File:** `src/pages/Tours.tsx:119`

```tsx
queryFn: () => store.listTours({ ...baseTourQuery }, { includeDetails: false }),
```

**Vấn đề:** Không set `limit`/`offset` trong query. Nếu có 1000+ tour, Supabase trả về tất cả trong 1 response. Non-detail query vẫn JOIN `tour_nationalities(*)`, `tour_shoppings(...)` cho mỗi tour, làm response rất nặng.

`TourQuery` interface (`src/types/tour.ts:227`) hỗ trợ `limit`/`offset` nhưng không được dùng ở Tours page.

---

## 4. `getToursGrandTotal()` — query riêng quét toàn bộ tours

**File:** `src/pages/Tours.tsx:157-162`

```tsx
const { data: allToursData } = useQuery({
  queryKey: TOUR_GRAND_TOTAL_QUERY_KEY,
  queryFn: () => store.getToursGrandTotal(),
  // ...
});
```

`getToursGrandTotal()` chạy `SELECT final_total` trên toàn bộ bảng `tours` (có count exact). Dữ liệu này có thể tính aggregate từ `listTours` đã fetch, không cần query riêng.

**File:** `src/lib/datastore/modules/tour-operations/tour-data.ts:41-55`

---

## 5. Lọc client-side thay vì filter SQL

**File:** `src/pages/Tours.tsx:145`

```tsx
const displayedTours = useMemo(() => filterToursForList(tours, listFilters), [tours, listFilters]);
```

**Vấn đề:** Các filter như `settlementStatus`, `paymentStatus`, `nationality`, `selectedMonth`, `selectedYear` được Supabase hỗ trợ WHERE clause (xem `tour-crud.ts:153-154`), nhưng Tours page fetch toàn bộ tour rồi lọc bằng JS.

Điều này gây:
- Tải nhiều dữ liệu hơn cần thiết qua mạng
- Không tận dụng index PostgreSQL

---

## 6. Nhiều reference queries riêng lẻ (N+1 style)

**File:** `src/pages/Tours.tsx`

Tours page chạy đồng thời các query độc lập:

| Query | Điều kiện |
|---|---|
| `listUserProfiles()` | admin only |
| `listCompanies({})` | luôn chạy |
| `listGuideUsers()` | admin only |
| `listNationalities({})` | luôn chạy |

Mỗi query là 1 HTTP request riêng đến Supabase REST API. Có thể gộp hoặc defer.

---

## 7. `keepPreviousData` khiến cache filter không tối ưu

**File:** `src/pages/Tours.tsx:120`

```tsx
placeholderData: keepPreviousData,
```

Giúp UI không bị flash loading khi đổi filter, nhưng mỗi lần filter change vẫn fetch lại toàn bộ dữ liệu từ đầu (không incremental). Kết hợp với việc không pagination, đây là vấn đề khi dataset lớn.

---

## 8. `optimizeDeps.include` chứa thư viện nặng không cần pre-bundle

**File:** `vite.config.ts:101`

```ts
optimizeDeps: {
  include: ["react", "react-dom", "fuse.js", "exceljs"],
},
```

`fuse.js` và `exceljs` được force pre-bundle dù:
- `fuse.js` nên được code-split (chỉ cần ở tour edit/import)
- `exceljs` đã dùng dynamic import, không cần pre-bundle

Pre-bundle các thư viện này làm tăng kích thước vendor chunk và thời gian khởi tạo dev server.

---

## 9. Triple auth request trên mỗi startup

**Files:** `src/App.tsx:114`, `src/contexts/AuthContext.tsx:59`, `src/components/Layout.tsx:268`

**Vấn đề:** Khi app khởi động, có **3 HTTP request riêng biệt** đến Supabase Auth:

1. `App.tsx:114` — `supabase.auth.getSession()`
2. `AuthContext.tsx:59` — `supabase.auth.getSession()` (AuthProvider mount)
3. `Layout.tsx:268` — `supabase.auth.getUser()` (Layout mount)

Cả 3 đều lấy cùng 1 thông tin user. Request #3 (`Layout.tsx:268`) hoàn toàn thừa vì AuthContext đã có `user`.

**Tác động:** +2 round-trip không cần thiết mỗi lần mở app. Trên mạng chậm (3G/4G), mỗi request ~200-500ms → tổng cộng +400-1000ms.

---

## 10. `SupabaseHealthBanner` — health check query trên mỗi page load

**File:** `src/components/SupabaseHealthBanner.tsx:11-24`

**Vấn đề:** Component chạy query `SELECT id FROM tours LIMIT 1` trên mỗi mount (tức mỗi lần load Layout). Query này có 2 vấn đề:
- Chạy **mọi lúc** dù user đã login bình thường (chỉ nên chạy khi có lỗi connection)
- `count: 'exact'` bắt Supabase đếm exact rows dù chỉ cần check connectivity

```tsx
const { error } = await supabase
  .from('tours')
  .select('id', { head: true, count: 'exact' })  // count: 'exact' gây COUNT(*) trên server
  .limit(1);
```

**Tác động:** +1 HTTP request + server-side COUNT(*) trên mỗi page load.

---

## 11. `countToursBySettlementStatus()` polling trong Layout

**File:** `src/components/Layout.tsx:80-87`

**Vấn đề:** Layout chạy `countToursBySettlementStatus()` với `refetchInterval: 60_000` và `refetchOnWindowFocus: true`. Query này:
- Chạy cho **mọi user** (kể cả viewer không có quyền settlement)
- Poll mỗi 60s dù user có thể đang ở trang không liên quan
- `count: 'exact'` gây COUNT(*) trên server

```tsx
const { data } = useQuery({
  queryKey: ['settlement-pending-count', statuses],
  queryFn: () => store.countToursBySettlementStatus(statuses),
  enabled,
  refetchInterval: enabled ? 60_000 : false,  // polling liên tục
  refetchOnWindowFocus: enabled,
});
```

**Tác động:** +1 COUNT(*) query mỗi 60s + additional query khi focus tab. Không cần thiết cho majority of users.

---

## 12. Google Fonts load sync — render-blocking font

**File:** `index.html:20`

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

**Vấn đề:** Font Inter load từ Google Fonts CDN. Dù `display=swap` giúp không block render, nhưng:
- **6 weight variants** (300-800) download ~150-300KB total font data
- Trên mạng chậm, font flash xuất hiện (FOUT) — text nhấp nháy từ system font sang Inter
- `preconnect` chỉ giải quyết DNS + TLS, không giảm thời gian download font bytes

**Tác động:** FOUT flash trên mạng chậm. Không block nhưng gây layout shift.

---

## 13. `jszip` import static trong 2 file

**Files:** `src/components/tours/TourImagesTab.tsx:9`, `src/pages/tours/useTourPageActions.ts:3`

**Vấn đề:** `jszip` (~45KB gzipped) được import static, nằm trong main bundle. Chỉ dùng khi:
- Xem ảnh tour (TourImagesTab)
- Export tour (useTourPageActions)

Cả 2 đều là lazy feature, không cần tải khi mới mở app.

**Tác động:** +45KB gzipped trong initial bundle.

---

## Tổng quan mức độ ảnh hưởng

| # | Nguyên nhân | Tác động | Dễ fix |
|---|---|---|---|
| 1 | **Thiếu code splitting** (React.lazy) | Cao — bundle 1.5MB+ | Trung bình |
| 2 | **getCurrentUserProfile() redundant** | Cao — +1-2 requests mỗi listTours | Dễ |
| 3 | **Không pagination** | Cao — payload tuyến tính theo data | Trung bình |
| 4 | **getToursGrandTotal() dư thừa** | Trung bình — scan thêm tours table | Dễ |
| 5 | **Lọc client-side** | Trung bình — không tận dụng index | Trung bình |
| 6 | **Nhiều reference query riêng** | Thấp-Trung bình — nhiều round trip | Dễ |
| 7 | **optimizeDeps.include thừa** | Thấp — pre-bundle phí | Dễ |
| 8 | **keepPreviousData + no pagination** | Thấp (kết hợp với #3) | Trung bình |
| 9 | **Triple auth request** (3 calls khi startup) | Cao — +400-1000ms trên mạng chậm | Dễ |
| 10 | **Health check query mỗi page load** | Trung bình — COUNT(*) server-side | Dễ |
| 11 | **Settlement count polling** trong Layout | Thấp — +COUNT(*) mỗi 60s | Dễ |
| 12 | **Google Fonts sync load** (6 weights) | Thấp — FOUT flash, ~300KB font | Dễ |
| 13 | **jszip static import** trong main bundle | Thấp — +45KB gzipped | Dễ |

---

## Hướng fix gợi ý

1. **React.lazy + Suspense** cho tất cả route pages
2. **Truyền user profile từ context xuống**, bỏ `getCurrentUserProfile()` trong `listTours()`
3. **Thêm server-side pagination** (limit/offset) vào Tours page
4. **Bỏ `getToursGrandTotal()`**, tính aggregate từ `listTours` hoặc dùng Supabase count
5. **Đẩy filter lên WHERE clause** thay vì JS filter
6. **Gộp reference queries** hoặc dùng `enabled` để defer
7. **Gỡ `fuse.js`, `exceljs` khỏi `optimizeDeps.include`**
8. **Bỏ `Layout.tsx:268` getUser()** — dùng user từ AuthContext thay vì gọi lại
9. **Defer health check** — chỉ chạy khi có lỗi, bỏ `count: 'exact'`
10. **Chuyển settlement count** vào component con, dùng `enabled` theo permission
11. **Self-host font** Inter hoặc giảm xuống 2-3 weights (400, 500, 600)
12. **Dynamic import `jszip`** — chỉ load khi user thực sự cần
