# HRC1.LT Gantt Chart - Trực quan hóa Lịch sản xuất Thép

Phiên bản 1.1.0

## 1. Tổng quan

**HRC1.LT Gantt Chart** là một ứng dụng web chuyên dụng được thiết kế để trực quan hóa lịch sản xuất thép phức tạp từ các tệp Excel hoặc Google Sheets trực tuyến. Hệ thống cho phép người quản lý sản xuất, kỹ sư và các bên liên quan dễ dàng tải lên, kết nối, xác thực và phân tích dữ liệu sản xuất thông qua một biểu đồ Gantt tương tác.

Mục tiêu chính của hệ thống là chuyển đổi dữ liệu thô từ bảng tính thành một giao diện đồ họa rõ ràng, giúp nhận diện nhanh chóng các luồng sản xuất, điểm nghẽn, sự chồng chéo và hiệu suất tổng thể của dây chuyền.

## 2. Tóm tắt Kiến trúc

Kiến trúc hệ thống được xây dựng theo mô hình **Client-Side Rendering (CSR)** với Next.js, kết hợp với **Server Actions** để xử lý các tác vụ phía máy chủ một cách an toàn như đọc dữ liệu từ Google Sheets.

### Sơ đồ Ngữ cảnh (C4 Context Diagram)

Sơ đồ này mô tả hệ thống và các tương tác chính của nó.

```mermaid
graph TD
    subgraph "Người Dùng"
        A[Người quản lý/Kỹ sư sản xuất]
    end

    subgraph "Hệ thống Trực quan hóa Gantt"
        B(HRC1.LT Gantt Chart Web App)
    end

    subgraph "Nguồn Dữ liệu"
        C1[/Tệp Lịch sản xuất .xlsx/]
        C2[<img src='https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png' width='20' /> Google Sheet]
    end
    
    A -- "1a. Tải lên tệp Excel" --> B
    A -- "1b. Cung cấp URL Google Sheet" --> B
    B -- "2. Phân tích, xác thực & trực quan hóa" --> A
    A -- "3. Tải về dữ liệu đã làm sạch & báo cáo lỗi" --> C1

    style B fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    style A fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
```

### Luồng Kiến trúc

1.  **Người dùng** có hai lựa chọn để cung cấp dữ liệu:
    *   **Lựa chọn A (Tệp Excel):** Chuẩn bị tệp lịch sản xuất và tải lên ứng dụng web.
    *   **Lựa chọn B (Google Sheet):** Cung cấp URL của một Google Sheet đã được chia sẻ.
2.  Ứng dụng web (Next.js/React) nhận yêu cầu:
    *   Với tệp Excel, nó sử dụng thư viện `xlsx` để **phân tích (parse)** dữ liệu phía client.
    *   Với URL Google Sheet, nó gọi một **Server Action**. Server Action này sẽ sử dụng Google Sheets API để đọc dữ liệu từ xa một cách an toàn.
3.  Một **bộ xác thực (Validator)** tùy chỉnh sẽ xử lý logic nghiệp vụ: chuẩn hóa đơn vị, tính toán thời gian, xác định thứ tự mẻ theo ca sản xuất (08:00 - 07:59).
4.  Dữ liệu hợp lệ được chuyển đến **component biểu đồ Gantt (D3.js)** để vẽ và hiển thị.
5.  Biểu đồ Gantt hỗ trợ các **layout hiển thị (Mặc định, Tùy chỉnh)** để người dùng có góc nhìn phù hợp.
6.  Các lỗi hoặc cảnh báo được thu thập và hiển thị riêng biệt để người dùng có thể rà soát.

## 3. Ngăn xếp Công nghệ (Tech Stack)

| Lĩnh vực              | Công nghệ                                                              | Lý do lựa chọn                                                         |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Frontend Framework**| [Next.js](https://nextjs.org/) (App Router, Server Actions) & [React](https://reactjs.org/) | Cung cấp cấu trúc mạnh mẽ, tối ưu hiệu suất và xử lý an toàn phía server. |
| **UI Components**     | [ShadCN/UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/) | Thư viện component dễ tùy biến, hiện đại và đảm bảo khả năng truy cập. |
| **Styling**           | [Tailwind CSS](https://tailwindcss.com/)                               | Framework CSS linh hoạt giúp xây dựng giao diện nhanh chóng và nhất quán. |
| **Data Visualization**| [D3.js](https://d3js.org/)                                               | Thư viện mạnh mẽ để tạo các biểu đồ tùy chỉnh và tương tác cao.       |
| **Excel Parsing**     | [SheetJS (xlsx)](https://sheetjs.com/)                                 | Thư viện phổ biến để đọc và xử lý tệp Excel trên client.   |
| **Google Sheet API**  | [google-spreadsheet](https://www.npmjs.com/package/google-spreadsheet) | Thư viện phổ biến để tương tác với Google Sheets API v4.              |
| **Date & Time**       | [date-fns](https://date-fns.org/)                                      | Thư viện nhỏ gọn, hiện đại để thao tác với đối tượng Date.           |
| **Ngôn ngữ**          | [TypeScript](https://www.typescriptlang.org/)                          | Tăng cường chất lượng mã nguồn và giảm lỗi với hệ thống kiểu tĩnh.        |
| **Icons**             | [Lucide React](https://lucide.dev/)                                    | Bộ icon gọn nhẹ, nhất quán và dễ sử dụng.                             |

## 4. Yêu cầu Hệ thống

-   **Node.js**: `v20.x` hoặc mới hơn.
-   **npm** (hoặc `yarn`, `pnpm`).
-   **Trình duyệt web**: Phiên bản mới nhất của Chrome, Firefox, Safari, hoặc Edge.

## 5. Biến môi trường

Để sử dụng tính năng nhập dữ liệu từ Google Sheet, bạn cần tạo một tệp `.env` ở thư mục gốc của dự án và cung cấp thông tin xác thực cho Google Service Account.

```
# .env

# Thông tin xác thực cho Google Service Account
# Thay thế bằng thông tin thực tế của bạn
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account-email@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

```

**Lưu ý quan trọng:**
1.  Tạo một **Service Account** trong Google Cloud Project của bạn.
2.  Bật **Google Sheets API** cho project đó.
3.  Lấy thông tin `client_email` và `private_key` từ tệp JSON của Service Account.
4.  **Chia sẻ (Share)** Google Sheet của bạn với địa chỉ email của Service Account (`client_email`) và cấp cho nó quyền **Viewer** (Người xem).

## 6. Cài đặt Local (Quickstart)

Thời gian dự kiến: **< 5 phút**.

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**

    Sử dụng `npm` để cài đặt tất cả các gói cần thiết từ `package.json`.

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Tạo một tệp `.env` và điền thông tin xác thực như hướng dẫn ở mục 5.

4.  **Run the development server:**

    Lệnh này sẽ khởi động ứng dụng Next.js ở chế độ phát triển.

    ```bash
    npm run dev
    ```

    *   **Verification:**
        Mở trình duyệt và truy cập [http://localhost:9002](http://localhost:9002). Bạn sẽ thấy giao diện chính của ứng dụng.

## 7. Build & Chạy ứng dụng

-   **Chạy chế độ phát triển (Development):**

    ```bash
    npm run dev
    ```

-   **Build cho Production:**

    ```bash
    npm run build
    ```

-   **Chạy chế độ Production:**

    ```bash
    npm run start
    ```

## 8. Tổng quan API

Hệ thống chủ yếu xử lý logic trên client, nhưng sử dụng **Next.js Server Actions** (`src/app/actions.ts`) cho các tác vụ cần bảo mật hoặc tương tác với API bên ngoài, ví dụ như `processGoogleSheetAction` để đọc dữ liệu từ Google Sheets.

## 9. Mô hình Dữ liệu (Data Model)

(Không thay đổi)

## 10. Các Tính năng / Module chính

-   **Data Uploader (`src/app/page.tsx`):**
    -   Giao diện người dùng cho phép chọn nguồn dữ liệu.
    -   Hỗ trợ tải lên tệp Excel (`.xlsx`, `.xls`) hoặc nhập URL Google Sheet.
    -   Kích hoạt Server Action hoặc xử lý phía client tương ứng.

-   **Parsers (`src/lib/excel-parser.ts`, `src/lib/google-sheet-parser.ts`):**
    -   **Excel Parser**: Đọc dữ liệu từ tệp Excel bằng `SheetJS` phía client.
    -   **Google Sheet Parser**: Chứa logic để kết nối và lấy dữ liệu từ Google Sheets API phía server.

-   **Validator (`src/lib/validator.ts`):**
    -   **Module cốt lõi của hệ thống.**
    -   Nhóm các hàng dữ liệu theo `Heat_ID`.
    -   Xác thực quy trình sản xuất và xử lý logic thời gian.
    -   Tính toán `sequenceInCaster` dựa trên ca sản xuất.

-   **Gantt Chart (`src/components/gantt-chart.tsx`):**
    -   Vẽ biểu đồ Gantt bằng D3.js.
    -   **Hỗ trợ chuyển đổi layout (Mặc định / Tùy chỉnh)** để thay đổi thứ tự hiển thị công đoạn.
    -   Trục Y (tên công đoạn) được **cố định** khi cuộn ngang.
    -   Xử lý tương tác người dùng (hover, click) để làm nổi bật mẻ thép.

-   **Error Display (`src/components/validation-errors.tsx`):**
    -   Hiển thị danh sách các lỗi và cảnh báo một cách rõ ràng.

## 11. Ghi chú về Hiệu suất & Khả năng mở rộng

-   **Hiệu suất**: Việc xử lý tệp Excel lớn vẫn phụ thuộc vào máy client. Việc xử lý Google Sheet được thực hiện trên server, giúp giảm tải cho client nhưng phụ thuộc vào tốc độ mạng và giới hạn của Google API.

## 12. Hướng dẫn Bảo mật

-   **Dữ liệu Excel**: Vẫn được xử lý hoàn toàn trên client và không được gửi đi đâu.
-   **Google Sheet Credentials**: Thông tin xác thực được lưu trong biến môi trường và chỉ được truy cập bởi Server Action, đảm bảo không bị lộ ra phía client.

(Các mục 13, 14, 15, 16 không có thay đổi lớn)

## 13. Giám sát, Ghi log & Quan sát

-   **Ghi log lỗi phía Client**: Các lỗi trong quá trình xử lý tệp được bắt lại và hiển thị trực tiếp trên giao diện cho người dùng.
-   **Ghi log lỗi phía Server**: Lỗi từ Server Action (ví dụ: không kết nối được Google Sheet) được ghi lại trên console của server.

## 14. Hướng dẫn Triển khai (CI/CD)

-   **Nền tảng đề xuất**: Vercel, Netlify, hoặc các nền tảng hỗ trợ Next.js.
-   **Lưu ý khi triển khai**: Cần cấu hình các biến môi trường (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) trên nền tảng triển khai.

## 15. Troubleshooting & Runbook

| Vấn đề                                           | Nguyên nhân có thể                                        | Hành động khắc phục                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Không thể tải lên tệp**                         | - Tệp không đúng định dạng.<br>- Tệp bị lỗi. | - Đảm bảo tệp có phần mở rộng chính xác.<br>- Thử mở và lưu lại tệp bằng Microsoft Excel.                               |
| **Không thể nhập từ Google Sheet**                | - URL không hợp lệ.<br>- Biến môi trường chưa được cấu hình.<br>- Service Account không có quyền truy cập sheet. | - Kiểm tra lại URL.<br>- Đảm bảo tệp `.env` đã được tạo và điền đúng thông tin.<br>- Chia sẻ sheet với email của Service Account (quyền Viewer). |
| **Ứng dụng bị treo hoặc rất chậm**                 | Tệp dữ liệu quá lớn.                 | - Chia nhỏ tệp thành các phần nhỏ hơn.<br>- Chờ đợi quá trình xử lý hoàn tất. |
| **Nhiều lỗi "Thiếu cột bắt buộc"**                 | Tiêu đề cột trong tệp không đúng với định dạng. | - So sánh tiêu đề trong tệp của bạn với tệp mẫu (`sample-data.xlsx`). |
| **Trục Y (Tên công đoạn) bị ẩn khi cuộn**           | Lỗi giao diện.                                       | Đây là lỗi đã được khắc phục. Nếu vẫn xảy ra, hãy thử xóa cache trình duyệt hoặc build lại dự án. |

## 16. Cộng tác viên & Quản trị

(Không thay đổi)
```