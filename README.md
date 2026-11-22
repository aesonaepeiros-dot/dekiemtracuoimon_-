# DataLens Studio – Nền tảng Làm sạch & Phân tích Dữ liệu Doanh nghiệp

> **Hệ thống Full-Stack phân tích & kiểm toán dữ liệu thực tế** dành cho doanh nghiệp, hỗ trợ đa định dạng tài liệu với trí tuệ nhân tạo **Google Gemini AI**.

---

## ✨ Điểm nổi bật của dự án

- **Zero-Setup (Chạy ngay không cần cài đặt phức tạp):**
  - Không cần cài MySQL/PostgreSQL (sử dụng H2 Database tự động).
  - Không cần cài Node.js / `npm install` (Giao diện Vanilla JS ES Modules chuẩn hiện đại, tải trực tiếp trên trình duyệt).
- **Hỗ trợ xử lý tệp tin thực tế toàn diện:** Tiếp nhận và bóc tách trực tiếp các định dạng: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`, `.json`, `.docx` và `.pdf`.
- **Cơ chế bóc tách PDF 2 tầng (Dual-Engine):**
  - *Tầng 1 (Local Engine):* Sắp xếp tọa độ X-Y theo thời gian thực, bóc tách bảng siêu tốc (< 50ms).
  * *Tầng 2 (Gemini Vision AI):* Tự động nhận diện và đọc dữ liệu từ các tài liệu PDF phức tạp hoặc ảnh scan.
- **Làm sạch & Kiểm định dữ liệu:** Tự động phát hiện ngoại lai IQR, điền giá trị khuyết thiếu (Mean/Median/Mode), chuẩn hóa chuỗi và lưu vết kiểm toán (Audit Trail) chi tiết.
- **Phân tích KPI & Biểu đồ tương tác:** Tính toán tức thì các chỉ số thống kê thực (Tổng giá trị, Trung bình, Trung vị, Độ lệch chuẩn, Phân phối, Xu hướng) với Chart.js.
- **Trí tuệ nhân tạo Google Gemini AI:** Sinh nhận định kinh doanh và khuyến nghị hành động chiến lược dựa trên dữ liệu thực tế.
- **Xuất báo cáo:** Xuất dữ liệu sạch và báo cáo phân tích ra file Excel (`.xlsx`) hoặc `.csv`.
- **Quy trình có hướng dẫn:** Trạng thái từng bước, hoàn tác dữ liệu, lọc nhật ký theo quy tắc và xem tác động làm sạch.
- **Bối cảnh phân tích & dữ liệu mẫu:** Ghi mục tiêu doanh nghiệp khi nạp tệp; thử toàn bộ quy trình với dữ liệu bán hàng mẫu có sẵn.
- **Sửa ô trực tiếp:** Nhấp vào ô trong bảng để chỉnh dữ liệu; thay đổi được lưu ngay và ghi vào nhật ký kiểm toán.
- **Hỏi dữ liệu bằng tiếng Việt:** Đặt câu hỏi về số liệu và nhận phân tích có xét bối cảnh đã nhập (cần Gemini API Key).
- **Dashboard có bộ lọc:** Lọc theo ngày/danh mục, chọn biểu đồ; xu hướng thời gian được sắp theo ngày. Bảng lịch sử tải trang phía máy chủ.
- **Báo cáo chia sẻ:** Excel, CSV, JSON, HTML offline và bản in có thể lưu thành PDF; báo cáo kèm thời gian tạo và tóm tắt chất lượng.

---

## 🛠️ Công nghệ sử dụng

- **Backend:** Java 17, Spring Boot 3.2.0, Spring Data JPA, Gradle 8.8 (Gradle Wrapper đính kèm).
- **Database:** H2 Database dạng tệp, tự tạo bảng qua JPA và giữ lịch sử sau khi khởi động lại.
- **Thư viện xử lý tài liệu:** Apache POI (Excel, Word), OpenCSV (CSV/TSV), Apache PDFBox (PDF).
- **AI Integration:** Google Generative Language API (Gemini 3.1 Flash-Lite, Gemini Flash Vision).
- **Frontend:** Single Page Application (SPA), Pure JavaScript (ES Modules), CSS3 Design System, Chart.js.

---

## 📋 Yêu cầu môi trường

- **Java Development Kit (JDK) 17** trở lên ([Tải JDK 17](https://adoptium.net/temurin/releases/?version=17))
- **Git** ([Tải Git](https://git-scm.com/))
- Trình duyệt web hiện đại: Chrome, Edge, Firefox, Cốc Cốc, Safari...

---

## 🚀 Hướng dẫn Clone & Khởi chạy (Chỉ 2 bước)

### Bước 1: Clone mã nguồn về máy

Mở cửa sổ dòng lệnh (Terminal / PowerShell / CMD) và chạy:

```bash
git clone https://github.com/<tai-khoan-cua-ban>/<ten-repository>.git
cd <ten-repository>/backend
```

### Bước 2: Khởi động ứng dụng

#### 👉 Trên Windows (PowerShell hoặc CMD):
```powershell
.\gradlew.bat bootRun
```

#### 👉 Trên macOS hoặc Linux:
```bash
chmod +x gradlew
./gradlew bootRun
```

*(Trong lần chạy đầu tiên, Gradle Wrapper sẽ tự động tải các thư viện cần thiết trong khoảng 1-2 phút).*

Khi màn hình xuất hiện thông báo:
```text
Tomcat started on port 8080 (http) with context path ''
Started DataLensApplication in ... seconds
```
Ứng dụng đã khởi động thành công!

### Bước 3: Mở trình duyệt

Truy cập địa chỉ:
👉 **[http://localhost:8080](http://localhost:8080)**

*(Backend Spring Boot đã tích hợp tự động phục vụ toàn bộ giao diện Frontend trên cổng 8080, bạn không cần chạy thêm bất kỳ live-server nào khác).*

---

## 🔑 Cấu hình Google Gemini AI (Tùy chọn)

Hệ thống có sẵn tính năng quản lý API Key trực tiếp trên giao diện:

1. Lấy khóa API miễn phí vĩnh viễn tại: [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Mở web `http://localhost:8080`, bấm vào nút **`🔑 Gemini API Key`** ở góc trên bên phải.
3. Dán khóa API của bạn vào ô nhập liệu $\rightarrow$ Bấm **`⚡ Kiểm tra kết nối`** $\rightarrow$ Bấm **`Lưu & Kích hoạt`**.
4. Khóa sẽ được lưu an toàn trong trình duyệt (`localStorage`) của bạn.

> **Ghi chú dự phòng (Heuristic Fallback):** Nếu bạn không nhập API Key hoặc khi mất mạng, hệ thống vẫn tự động chuyển sang **Bộ phân tích Heuristic nội bộ** dựa trên toán xác suất thống kê để đảm bảo website hoạt động ổn định 100%.

---

## 🗄️ Quản lý Cơ sở dữ liệu H2 Console

Bạn có thể xem dữ liệu và cấu trúc các bảng trực tiếp qua giao diện H2 Console:

- **Đường dẫn Web Console:** [http://localhost:8080/h2-console](http://localhost:8080/h2-console)
- **JDBC URL:** `jdbc:h2:file:./data/datalens_db;DB_CLOSE_ON_EXIT=FALSE`
- **User Name:** `sa`
- **Password:** *(để trống)*

Các bảng được Spring Data JPA tự động quản lý. Cơ sở dữ liệu lưu tại `backend/data/` và dữ liệu lịch sử vẫn còn sau khi khởi động lại ứng dụng:
- `DATASETS`: Lưu trữ lược đồ, số dòng, số cột, metadata tệp tải lên.
- `CLEANING_SESSIONS`: Lưu từng phiên làm sạch và các quy tắc áp dụng.
- `AUDIT_LOGS`: Lưu vết chi tiết từng ô dữ liệu đã được sửa đổi Trước → Sau.
- `ANALYSIS_REPORTS`: Lưu trữ kết quả phân tích thống kê và nhận định kinh doanh.

Có thể cấu hình an toàn lưu trữ bằng biến môi trường: `DATALENS_MAX_UPLOAD_SIZE` (mặc định `50MB`), `DATALENS_MAX_REQUEST_SIZE` (mặc định `50MB`) và `DATALENS_RETENTION_DAYS` (mặc định `0`, tắt tự xóa). Khi đặt số ngày lưu lớn hơn 0, dữ liệu cùng nhật ký và báo cáo liên quan sẽ được xóa tự động lúc 03:00 mỗi ngày sau thời hạn đó.

---

## 📁 Cấu trúc thư mục dự án

```text
├── backend/                  # Ứng dụng Java Spring Boot 3 (Build tool: Gradle)
│   ├── build.gradle          # Cấu hình dependencies (POI, OpenCSV, PDFBox, H2, Gson...)
│   ├── settings.gradle       # Cấu hình dự án Gradle
│   ├── gradlew & gradlew.bat # Gradle Wrapper thực thi
│   ├── gradle/wrapper/       # Gradle Wrapper distribution (Gradle 8.8)
│   ├── src/main/java/com/datalens/
│   │   ├── config/           # Cấu hình Web & CORS Filter
│   │   ├── controller/       # REST API Endpoints (/dataset, /clean, /analyze, /gemini, /export)
│   │   ├── dto/              # Đối tượng truyền nhận dữ liệu
│   │   ├── model/            # Thực thể JPA (Dataset, AuditLog, CleaningSession...)
│   │   ├── repository/       # Giao diện tương tác cơ sở dữ liệu
│   │   └── service/          # Nghiệp vụ: FileParser, DataCleaner, Analytics, GeminiService, ExportService
│   └── src/main/resources/
│       └── application.properties # Cấu hình Spring Boot & H2
│
├── frontend/                 # Giao diện Enterprise Data Studio (SPA)
│   ├── index.html            # Giao diện ứng dụng chính
│   ├── css/                  # Hệ thống giao diện: main.css, grid.css, animations.css
│   ├── js/                   # Modules: api.js, app.js, grid.js, charts.js, upload.js, export.js, ui.js
│   └── assets/logo.svg       # Logo vector
│
├── .gitignore                # Danh sách loại trừ các file rác khi đẩy Git
└── README.md                 # Tài liệu hướng dẫn sử dụng này
```
