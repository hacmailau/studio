# 📊 Phân Tích Cách Tính AVG (Trung Bình)

## 🎯 Hàm calcStats

```typescript
const calcStats = (ops: Operation[] | undefined): UnitTimeStats => {
  if (!ops || ops.length === 0) return { avg: 0, min: 0, max: 0 };

  const durations = ops.map((op) => op.Duration_min);
  const total = durations.reduce((acc, time) => acc + time, 0);

  return {
    avg: Math.round(total / ops.length),
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
};
```

---

## 📐 Công Thức Tính AVG

### **Bước 1: Extract Duration từ mỗi Operation**

```typescript
const durations = ops.map((op) => op.Duration_min);
```

**Kết quả:** Array của các thời gian xử lý

```
[60, 90, 30, 45, 55]
```

### **Bước 2: Tính Tổng (Sum)**

```typescript
const total = durations.reduce((acc, time) => acc + time, 0);
```

**Công thức reduce:**

```
(accumulator, currentValue) => accumulator + currentValue, 0
```

**Chi tiết từng bước:**

```
Iteration 1: acc = 0,  time = 60   → 0 + 60 = 60
Iteration 2: acc = 60, time = 90   → 60 + 90 = 150
Iteration 3: acc = 150, time = 30  → 150 + 30 = 180
Iteration 4: acc = 180, time = 45  → 180 + 45 = 225
Iteration 5: acc = 225, time = 55  → 225 + 55 = 280

total = 280 phút
```

### **Bước 3: Tính Trung Bình**

```typescript
avg: Math.round(total / ops.length);
```

**Công thức:**
$$\text{avg} = \text{round}\left(\frac{\text{total}}{\text{số lượng}}\right)$$

**Ví dụ:**

```
total = 280
ops.length = 5
280 / 5 = 56
avg = Math.round(56) = 56 phút
```

---

## 📊 Ví Dụ Chi Tiết - Tính AVG BOF

### **Input Data:**

Giả sử có 4 mẻ với công đoạn BOF:

| Heat_ID | Unit | Duration_min |
| ------- | ---- | ------------ |
| HRC001  | BOF1 | 90           |
| HRC002  | BOF2 | 85           |
| HRC003  | BOF1 | 95           |
| HRC004  | BOF3 | 80           |

### **Processing Steps:**

**Step 1: Filter operations với group = "BOF"**

```javascript
ops = [
  { unit: "BOF1", Duration_min: 90 },
  { unit: "BOF2", Duration_min: 85 },
  { unit: "BOF1", Duration_min: 95 },
  { unit: "BOF3", Duration_min: 80 },
];
```

**Step 2: Extract durations**

```typescript
durations = [90, 85, 95, 80];
```

**Step 3: Tính total**

```
total = 90 + 85 + 95 + 80 = 350 phút
```

**Step 4: Tính average**

```
avg = Math.round(350 / 4)
    = Math.round(87.5)
    = 88 phút ✅
```

**Output:**

```json
{
  "avg": 88,
  "min": 80,
  "max": 95
}
```

---

## 🔧 Math.round() - Làm Tròn

### **Cách hoạt động của Math.round():**

| Input | Output | Quy Tắc        |
| ----- | ------ | -------------- |
| 87.4  | 87     | Làm tròn xuống |
| 87.5  | 88     | Làm tròn lên   |
| 87.6  | 88     | Làm tròn lên   |
| 88.0  | 88     | Giữ nguyên     |
| 88.9  | 89     | Làm tròn lên   |

### **Ví dụ:**

```typescript
Math.round(87.5); // → 88
Math.round(87.49); // → 87
Math.round(87.51); // → 88
Math.round(350 / 4); // → Math.round(87.5) → 88
```

---

## 📈 Trường Hợp Thực Tế - Báo Cáo Mác Thép SS400

### **Dữ liệu:**

Cho mác thép **SS400** có 3 mẻ:

- HRC001: KR→BOF(90)→LF(45)→CASTER(60)
- HRC002: KR→BOF(85)→LF(50)→CASTER(65)
- HRC003: KR→BOF(95)→LF(48)→CASTER(62)

### **Tính AVG cho mỗi group:**

#### **Group KR:**

```
ops = [60, 60, 60]  (giả sử cùng thời gian)
total = 60 + 60 + 60 = 180
avg = Math.round(180 / 3) = 60 phút
```

#### **Group BOF:**

```
ops = [90, 85, 95]
total = 90 + 85 + 95 = 270
avg = Math.round(270 / 3) = 90 phút
```

#### **Group LF:**

```
ops = [45, 50, 48]
total = 45 + 50 + 48 = 143
avg = Math.round(143 / 3) = 48 phút  (làm tròn từ 47.67)
```

#### **Group CASTER:**

```
ops = [60, 65, 62]
total = 60 + 65 + 62 = 187
avg = Math.round(187 / 3) = 62 phút  (làm tròn từ 62.33)
```

### **Output Báo Cáo:**

```
Mác SS400:
├─ KR:     avg=60, min=60, max=60
├─ BOF:    avg=90, min=85, max=95
├─ LF:     avg=48, min=45, max=50
└─ CASTER: avg=62, min=60, max=65
```

---

## 🎯 Các Edge Cases

### **Case 1: Array Rỗng**

```typescript
ops = []
→ return { avg: 0, min: 0, max: 0 }
```

### **Case 2: Một phần tử**

```typescript
ops = [{ Duration_min: 75 }];
durations = [75];
total = 75;
avg = Math.round(75 / 1) = 75;
```

### **Case 3: Kết quả không phải số nguyên**

```typescript
ops = [30, 40, 35]  // 3 phần tử
total = 30 + 40 + 35 = 105
avg = Math.round(105 / 3)
    = Math.round(35)
    = 35

// Nếu thay đổi:
ops = [30, 40, 36]  // 3 phần tử
total = 30 + 40 + 36 = 106
avg = Math.round(106 / 3)
    = Math.round(35.333...)
    = 35
```

---

## 💡 Điểm Quan Trọng

| Điểm             | Giải Thích                                                |
| ---------------- | --------------------------------------------------------- |
| **ops.length**   | Số lượng operations có trong group (KR, BOF, LF, CASTER)  |
| **Duration_min** | Thời gian xử lý (phút) của mỗi operation                  |
| **Math.round()** | Làm tròn đến số nguyên gần nhất                           |
| **Công thức**    | avg = tổng / số lượng                                     |
| **Ý nghĩa**      | Thời gian xử lý **trung bình** của group đó qua tất cả mẻ |

---

## 🔍 Console Log

```typescript
console.log("Durations for", grade, ops[0]?.group, durations, total);
// Output: Durations for SS400 BOF [90, 85, 95] 270
```

**Giải thích:**

- `grade` = "SS400" (mác thép)
- `ops[0]?.group` = "BOF" (nhóm công đoạn)
- `durations` = [90, 85, 95] (array thời gian)
- `total` = 270 (tổng)

---

## 📝 Tóm Tắt

```
calcStats() tính Average như sau:

  1. Extract Duration từ mỗi OP: [90, 85, 95]
  2. Tính Sum: 90 + 85 + 95 = 270
  3. Tính Average: 270 ÷ 3 = 90 phút
  4. Làm tròn: Math.round(90) = 90

  Kết quả: avg = 90 phút
```

**Công thức tổng quát:**
$$\text{avg} = \text{round}\left(\frac{\sum_{i=1}^{n} \text{Duration}[i]}{n}\right)$$

Trong đó:

- $n$ = số lượng operations
- $\text{Duration}[i]$ = thời gian của operation thứ $i$
