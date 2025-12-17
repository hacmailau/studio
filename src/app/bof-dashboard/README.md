# BOF Dashboard

## Mục đích

- Trang tổng quan hiển thị trạng thái thùng và ghi chép vận hành theo bố cục trực quan.
- Hỗ trợ xem nhanh chi tiết thùng qua tooltip và dialog.

## Đường dẫn

- Trang: `/bof-dashboard`

## Cấu hình dữ liệu

Trang có thể lấy dữ liệu động qua hai biến môi trường:

- `NEXT_PUBLIC_BOF_SECTIONS_URL`: API trả về danh sách các khối hiển thị.
- `NEXT_PUBLIC_BOF_LOGS_URL`: API trả về bảng ghi chép.

Nếu các biến môi trường không được cấu hình, trang sử dụng dữ liệu mẫu nội bộ.

### Định dạng dữ liệu

`NEXT_PUBLIC_BOF_SECTIONS_URL` trả về mảng `Section[]`:

```json
[
  {
    "title": "lò cao",
    "items": [
      {
        "id": "120",
        "label": "5#",
        "duration": "01:16m",
        "distance": "",
        "state": "idle",
        "details": {
          "bucketId": "U120",
          "steelGrade": "SAE1006-Al",
          "heatId": "TEMP2025-120",
          "temperature": 1452,
          "weight": 292.3,
          "timestamps": { "depart": "08:51:38" },
          "chemistry": { "C": 4.3, "Si": 0.5, "Mn": 0.7, "P": 0.04, "S": 0.03 }
        }
      }
    ]
  }
]
```

`NEXT_PUBLIC_BOF_LOGS_URL` trả về mảng `LogRow[]`:

```json
[
  {
    "time": "2025-11-20",
    "furnace": "L06",
    "bof": "B1",
    "car": "U06",
    "amountPlanned": 292.3,
    "amountActual": 292.0,
    "batch": "TEMP2025 112003",
    "depart": "08:51:38",
    "arriveWater": "08:56:21",
    "leaveWater": "08:56:54",
    "arriveSteel": "08:59:24",
    "leaveSteel": "09:02:54",
    "ladle": "",
    "toYard": "",
    "leaveYard": ""
  }
]
```

## Triển khai

Thiết lập biến môi trường trong `.env.local`:

```
NEXT_PUBLIC_BOF_SECTIONS_URL=https://api.example.com/bof/sections
NEXT_PUBLIC_BOF_LOGS_URL=https://api.example.com/bof/logs
```

Khởi chạy ứng dụng và mở `/bof-dashboard` để kiểm tra.