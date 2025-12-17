# Phân Tích Dữ Liệu Input - Xử Lý Casting Sequence

## 📥 Nguồn Dữ Liệu Input

Hệ thống hỗ trợ 3 nguồn dữ liệu chính:

### 1. **Tệp Excel (.xlsx, .xls, .csv)**

- Upload thủ công qua UI (`FileUploader`)
- Xử lý bằng `parseExcel()` trong `src/lib/excel-parser.ts`

### 2. **Google Sheet**

- Được xử lý qua `processGoogleSheetAction()` (server action)
- Chưa hoạt động đầy đủ trong bản demo

### 3. **Dữ Liệu Demo (JSON tĩnh)**

- File: `src/Services/dataDemoGantt.json`
- 15,472 dòng, chứa hàng trăm mẻ thép

---

## 📋 Cấu Trúc Dữ Liệu Raw Excel

### Tiêu Đề Cột Bắt Buộc

| Cột         | Tên Tiếng Anh                 | Tên Tiếng Việt      | Loại           | Bắt Buộc    |
| ----------- | ----------------------------- | ------------------- | -------------- | ----------- |
| Heat ID     | `heat_id` / `Heat_ID`         | `methep`            | String         | ✅ Có       |
| Steel Grade | `steel_grade` / `Steel_Grade` | `macthep`           | String         | ✅ Có       |
| Unit        | `unit` / `congdoan`           | `congdoan`          | String         | ✅ Có       |
| Start Time  | `start_time` / `starttime`    | `thoigianbatdau`    | String (HH:MM) | ✅ Có       |
| End Time    | `end_time` / `endtime`        | `thoigianketthuc`   | String (HH:MM) | ✅ Có       |
| Date        | `date` / `thoigian`           | `ngay` / `thoigian` | String         | ❌ Tùy chọn |
| Sequence    | `sequence_number`             | `seq`               | Number         | ❌ Tùy chọn |

### Chuẩn Hóa Tiêu Đề (Normalization)

Hàm `normalizeHeader()` sẽ:

- Chuyển sang chữ thường
- Loại bỏ dấu Việt (diacritical marks)
- Xóa khoảng trắng và ký tự đặc biệt
- Xóa dấu gạch dưới

**Ví dụ:**

- `Start Time` → `starttime`
- `start_time` → `starttime`
- `Thời Gian Bắt Đầu` → `thoigianbatdau`
- `HEAT_ID` → `heatid`

---

## 🔄 Luồng Xử Lý Dữ Liệu Input

```
┌─────────────────────────────┐
│   Raw Excel File (.xlsx)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  parseExcel()                           │
│  - Đọc file với FileReader              │
│  - XLSX.read() parse file               │
│  - sheet_to_json() chuyển thành mảng    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  processRows()                           │
│  - Chuẩn hóa tiêu đề (normalizeHeader) │
│  - Map cột → ExcelRow properties        │
│  - Validate required fields             │
│  - Filter placeholder rows              │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  ExcelRow[] (Clean Data)         │
│  + ValidationError[] (Warnings)  │
└──────────────┬───────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│  validateAndTransform()                 │
│  - Xác thực unit (UNIT_SEQUENCE)       │
│  - Parse time với xử lý midnight       │
│  - Kiểm tra routing (KR→BOF→LF→CASTER) │
│  - Tính sequenceInCaster               │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│  GanttHeat[] (Ready to Display)        │
│  - Mỗi heat có sequenceInCaster       │
│  - Sẵn sàng hiển thị trên biểu đồ     │
└────────────────────────────────────────┘
```

---

## 📊 Cấu Trúc Dữ Liệu Từng Giai Đoạn

### Giai Đoạn 1: Raw Excel (2D Array)

```typescript
[
  // Header row
  ["Date", "Heat_ID", "Steel_Grade", "Unit", "Start_Time", "End_Time", "sequence_number"],

  // Data rows
  ["2025-11-01", "A6481", "SAE1006-Al", "KR1", "04:43", "05:25", null],
  ["2025-11-01", "A6481", "SAE1006-Al", "BOF1", "05:45", "06:26", null],
  ...
]
```

### Giai Đoạn 2: ExcelRow (Parsed & Cleaned)

```typescript
interface ExcelRow {
  dateStr: string; // "2025-11-01"
  heatId: string; // "A6481"
  steelGrade: string; // "SAE1006-Al"
  unit: string; // "KR1"
  startStr: string; // "04:43"
  endStr: string; // "05:25"
  seqNum?: number; // undefined or number
  rawIndex: number; // 1 (0-based from header)
}
```

### Giai Đoạn 3: Operation (After parseTimeWithDate)

```typescript
interface Operation {
  unit: string; // "KR1"
  group: string; // "KR"
  sequence_order: number; // 1
  startTime: Date; // 2025-11-01T04:43:00Z
  endTime: Date; // 2025-11-01T05:25:00Z
  Duration_min: number; // 42
  idleTimeMinutes?: number; // 0
}
```

### Giai Đoạn 4: GanttHeat (Final Ready-to-Display)

```typescript
interface GanttHeat {
  Heat_ID: string; // "A6481"
  Steel_Grade: string; // "SAE1006-Al"
  operations: Operation[]; // [...]
  isComplete: boolean; // true (có CASTER)
  totalDuration: number; // 154
  totalIdleTime: number; // 43
  castingMachine?: string; // undefined (không có CASTER)
  sequenceInCaster?: number; // undefined (không tính được)
}
```

---

## 📝 Ví Dụ Thực Tế

### Input (Từ dataDemoGantt.json)

```json
{
  "Heat_ID": "A6481",
  "Steel_Grade": "SAE1006-Al",
  "operations": [
    {
      "unit": "KR1",
      "group": "KR",
      "sequence_order": 1,
      "startTime": "2025-11-01T04:43:00",
      "endTime": "2025-11-01T05:25:00",
      "Duration_min": 42,
      "idleTimeMinutes": 0
    },
    {
      "unit": "BOF1",
      "group": "BOF",
      "sequence_order": 2,
      "startTime": "2025-11-01T05:45:00",
      "endTime": "2025-11-01T06:26:00",
      "Duration_min": 41,
      "idleTimeMinutes": 0
    },
    {
      "unit": "LF5",
      "group": "LF",
      "sequence_order": 3,
      "startTime": "2025-11-01T06:49:00",
      "endTime": "2025-11-01T08:00:00",
      "Duration_min": 71,
      "idleTimeMinutes": 0
    }
  ],
  "isComplete": true, // ← Không có CASTER!
  "totalDuration": 154,
  "totalIdleTime": 43,
  "castingMachine": null, // ← null
  "sequenceInCaster": 1 // ← Sẽ không tính được
}
```

**Nhận Xét**: Mẻ này **KHÔNG hoàn chỉnh** vì thiếu công đoạn CASTER (TSC/BCM).

### Ví Dụ 2: Mẻ Hoàn Chỉnh (Có CASTER)

```json
{
  "Heat_ID": "A6482",
  "Steel_Grade": "SAE1006-Al",
  "operations": [
    { "unit": "KR1", "group": "KR", "startTime": "2025-11-01T06:11:00", ... },
    { "unit": "BOF1", "group": "BOF", "startTime": "2025-11-01T07:03:00", ... },
    { "unit": "LF5", "group": "LF", "startTime": "2025-11-01T08:28:00", ... },
    {
      "unit": "TSC1",              // ← CASTER!
      "group": "CCM",              // ← group = "CASTER" trong validator
      "startTime": "2025-11-01T09:40:00",
      "endTime": "2025-11-01T10:13:00",
      "Duration_min": 33,
      ...
    }
  ],
  "isComplete": true,              // ← true (có CASTER)
  "castingMachine": "TSC1",        // ← TSC1
  "sequenceInCaster": 1            // ← Sẽ được tính toán
}
```

---

## 🔍 Xác Thực & Lọc Dữ Liệu

### Kiểu Lỗi (ValidationError.kind)

| Kind          | Mô Tả                                      | Mức Độ      |
| ------------- | ------------------------------------------ | ----------- |
| `FORMAT`      | Thời gian không hợp lệ (không match HH:MM) | ❌ Lỗi      |
| `UNIT`        | Thiết bị (Unit) không được định nghĩa      | ⚠️ Cảnh báo |
| `ROUTING`     | Luồng sản xuất không hợp lệ                | ❌ Lỗi      |
| `OVERLAP`     | Công đoạn bị chồng lấn                     | ⚠️ Cảnh báo |
| `TIME`        | Xử lý thời gian đi qua đêm lỗi             | ❌ Lỗi      |
| `MISSING`     | Thiếu trường bắt buộc                      | ❌ Lỗi      |
| `PLACEHOLDER` | Hàng giữ chỗ (Unit='0', thời gian 00:00)   | ⚠️ Cảnh báo |

### Các Quy Tắc Lọc

1. **Hàng trống**: Bỏ qua (skip)
2. **Placeholder**: Loại bỏ với cảnh báo
   - `Unit === "0"`
   - `startStr === "00:00" && endStr === "00:00"`
3. **Unit không xác định**: Warning (tiếp tục xử lý)
4. **Lỗi thời gian**: Dừng xử lý mẻ (fatal error)
5. **Routing lỗi**:
   - Không thể chạy trên 2+ máy cùng nhóm (except LF)
   - Phải có BOF trước khi có LF

---

## ⏰ Xử Lý Thời Gian Đặc Biệt

### Xử Lý Midnight (Qua Đêm)

Nếu `endTime < startTime` → thêm 1 ngày vào `endTime`:

```typescript
if (endTime < startTime) {
  endTime.setUTCDate(endTime.getUTCDate() + 1);
}
```

**Ví dụ**:

- Start: `23:45` ngày 01/11
- End: `01:30` (sẽ được hiểu là 01:30 ngày 02/11)

### Sắp Xếp Công Đoạn

Các công đoạn được sắp xếp lại theo thứ tự:

1. Nếu có `seqNum` → sắp xếp theo `seqNum`
2. Nếu không → sắp xếp theo `startStr` (HH:MM)
3. Sau cùng → sắp xếp theo `rawIndex`

### Tính Idle Time (Thời Gian Chờ)

```typescript
const idle = (operation[i].startTime - operation[i - 1].endTime) / 1000 / 60;
operation[i].idleTimeMinutes = idle > 0 ? idle : 0;
```

---

## 📈 Thống Kê Input

### Từ File Demo (dataDemoGantt.json)

- **Tổng số mẻ**: ~400-500 mẻ
- **Ngày dữ liệu**: 2025-11-01 đến 2025-11-04
- **Máy đúc**: TSC1, TSC2, BCM1, BCM2, BCM3
- **Mác thép**: SAE1006-Al, CT5, EM12K, SWRH82B, ...
- **Công đoạn**: KR1/2, BOF1-5, LF1-5, TSC1/2, BCM1/2/3

### Phân Loại Mẻ

- ✅ **Complete** (có CASTER): ~60-70%
- ❌ **Incomplete** (không CASTER): ~30-40%

---

## 🎯 Kiểm Soát Chất Lượng Input

### Bước Kiểm Tra Trước Xử Lý

1. ✅ Kiểm tra required fields (Heat_ID, Unit, Start_Time, End_Time)
2. ✅ Kiểm tra format thời gian (HH:MM)
3. ✅ Kiểm tra Unit hợp lệ (UNIT_SEQUENCE)
4. ✅ Loại bỏ placeholder rows
5. ✅ Xác thực routing logic

### Sau Xử Lý Thành GanttHeat

- 🔍 Chỉ xuất hiện trên biểu đồ nếu `isComplete === true`
- 🔍 Có `sequenceInCaster` nếu có công đoạn CASTER
- 🔍 Hiển thị số thứ tự `(#n)` trên CASTER

---

## 💾 Nơi Lưu Trữ Input

### Trong Code

- **Kiểu dữ liệu**: `ExcelRow[]` (raw), `GanttHeat[]` (processed)
- **State React**: `ganttData`, `cleanJson`, `previewData`

### Trong File

- **Demo data**: `src/Services/dataDemoGantt.json` (static)
- **Upload**: Tạm thời trong memory (`FileReader`), không lưu backend

### Khi Export

- **Export JSON**: `cleanJson` (ExcelRow[])
- **Export Error Log**: CSV chứa các lỗi/cảnh báo

---

## 🔗 Luồng Dữ Liệu Tổng Hợp

```
Raw Input (Excel/JSON)
    ↓
[parseExcel] hoặc [load demo]
    ↓
ExcelRow[] (20 dòng preview)
    ↓
[validateAndTransform]
    ↓
GanttHeat[] + ValidationError[]
    ↓
[processGanttChart - D3.js]
    ↓
Biểu đồ Gantt hiển thị
    ↓
[Tooltip/Click]
    ↓
Chi tiết mẻ + Statistics
```

---

## 📌 Tóm Tắt

| Khía Cạnh    | Chi Tiết                                         |
| ------------ | ------------------------------------------------ |
| **Nguồn**    | Excel, Google Sheet, JSON static                 |
| **Tiêu Đề**  | Chuẩn hóa (Vietnamese + English)                 |
| **Yêu cầu**  | Heat_ID, Steel_Grade, Unit, Start_Time, End_Time |
| **Xác thực** | Unit, routing, time format, placeholder          |
| **Xử lý**    | Midnight handling, sequence sorting              |
| **Output**   | GanttHeat[] với sequenceInCaster                 |
| **Hiển thị** | Biểu đồ Gantt + tooltip + stats                  |
