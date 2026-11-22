# DataLens Studio – Nền tảng Làm sạch & Phân tích Dữ liệu Doanh nghiệp

## Giới thiệu

Hệ thống Full-Stack phân tích & kiểm toán dữ liệu thực tế dành cho doanh nghiệp:
- **Backend**: Java 17 + Spring Boot 3 + Gradle + H2 Database (tự động tạo, không cần cài đặt).
- **Frontend**: Single Page Application (SPA) Enterprise UI, thuần JavaScript ES Modules + CSS hiện đại.
- **AI Engine**: Tích hợp Google Gemini Flash API cho nhận định kinh doanh và đề xuất hành động.
- **Xử lý tài liệu thực tế**: Tiếp nhận và bóc tách trực tiếp bất kỳ tệp dữ liệu nào từ máy tính: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`, `.json`, `.docx`, `.pdf`.

---

## Yêu cầu môi trường
- **Java 17** (Temurin/OpenJDK 17 đã có trên máy)
- Trình duyệt hiện đại: Chrome, Edge, Cốc Cốc

---

## Hướng dẫn khởi động (2 bước)

### Bước 1: Khởi động Backend (Gradle + Spring Boot)

Mở PowerShell hoặc CMD tại thư mục dự án và chạy:

```powershell
cd D:\Giup_Duong_Web\demo\backend
.\gradlew.bat bootRun
```

Hoặc chạy trực tiếp tệp JAR đã biên dịch sẵn:

```powershell
cd D:\Giup_Duong_Web\demo\backend
java -jar build\libs\datalens-backend-1.0.0.jar
```

### Bước 2: Mở Giao diện trên Trình duyệt

Mở trình duyệt và truy cập: **http://localhost:8080**
*(Backend tự động serve toàn bộ giao diện Frontend tại cổng 8080)*

---

## Cơ sở dữ liệu H2 Database Console

- **Đường dẫn Web Console:** [http://localhost:8080/h2-console](http://localhost:8080/h2-console)
- **JDBC URL:** `jdbc:h2:file:./data/datalens_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`
- **User Name:** `sa`
- **Password:** *(để trống)*

Các bảng được tự động quản lý qua Spring Data JPA:
- `DATASETS`: Lưu trữ lược đồ, số dòng, số cột, metadata tệp tải lên.
- `CLEANING_SESSIONS`: Lưu từng phiên làm sạch và tập quy tắc áp dụng.
- `AUDIT_LOGS`: Lưu vết chi tiết từng ô dữ liệu đã được sửa đổi Trước → Sau.
- `ANALYSIS_REPORTS`: Lưu trữ kết quả phân tích thống kê và nhận định.

---

## Cấu hình Google Gemini API (Tùy chọn)

Để kích hoạt tính năng phân tích nâng cao với Google Gemini Flash:
1. Mở tệp `backend/src/main/resources/application.properties`
2. Điền API Key của bạn:
   ```properties
   gemini.api.key=YOUR_API_KEY_HERE
   ```
*(Nếu chưa cấu hình API Key, hệ thống tự động chuyển sang bộ phân tích thống kê toán học Heuristic nội bộ, bảo đảm hệ thống luôn hoạt động mượt mà).*

---

## Cấu trúc thư mục dự án

```text
demo/
├── backend/                  # Ứng dụng Java Spring Boot 3 (Build tool: Gradle)
│   ├── build.gradle          # Cấu hình Gradle dependencies (POI, OpenCSV, PDFBox, H2...)
│   ├── settings.gradle       # Tên dự án: datalens-backend
│   ├── gradlew & gradlew.bat # Gradle Wrapper
│   ├── gradle/wrapper/       # Gradle Wrapper distribution config (Gradle 8.8)
│   ├── src/main/java/com/datalens/
│   │   ├── config/CorsConfig.java
│   │   ├── controller/       # 5 REST Controllers
│   │   ├── dto/              # DTOs truyền nhận dữ liệu
│   │   ├── model/            # JPA Entities (Dataset, AuditLog, CleaningSession...)
│   │   ├── repository/       # JPA Repositories
│   │   └── service/          # FileParser, DataCleaner, Analytics, Gemini, Export
│   ├── src/main/resources/application.properties
│   └── build/libs/           # datalens-backend-1.0.0.jar (Thành phẩm thực thi)
│
├── frontend/                 # Giao diện Enterprise Data Studio
│   ├── index.html            # Giao diện SPA chính
│   ├── css/                  # main.css, grid.css, animations.css
│   ├── js/                   # api.js, app.js, grid.js, charts.js, upload.js, export.js, ui.js
│   └── assets/logo.svg       # Logo vector
│
└── README.md                 # Tài liệu hướng dẫn này
```

---

## Quy trình 4 bước Xử lý Tài liệu Thực tế

1. **Bước 1 – Nạp dữ liệu:** Kéo thả tệp bất kỳ từ máy (.xlsx, .xls, .csv, .tsv, .txt, .json, .docx, .pdf). Hệ thống tự bóc tách bảng và kiểm tra tính toàn vẹn.
2. **Bước 2 – Làm sạch & Kiểm toán:** 6 công tắc bật/tắt (cắt khoảng trắng, khử trùng lặp, chuẩn hóa chữ, phát hiện ngoại lai IQR, điền khuyết...). Bảng Data Grid tô màu ô đã sửa (xanh) và ngoại lai (vàng cam). Toàn bộ thay đổi lưu vào AUDIT_LOGS.
3. **Bước 3 – Dashboard KPI & AI:** 4 KPI chuẩn Việt Nam (Tổng, Trung bình, Trung vị, Độ lệch chuẩn), 5 biểu đồ Chart.js (Cột, Đường, Tròn, Pareto ABC, Histogram) và nhận định kinh doanh từ Google Gemini Flash.
4. **Bước 4 – Xuất kết quả:** Xuất file Excel (.xlsx 2 sheets), CSV UTF-8, JSON và Dashboard HTML mở offline.
