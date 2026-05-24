# 🍽️ Tastee Backend API - Hướng dẫn Cài đặt, Chuyển giao & Tích hợp Hệ thống

Chào mừng bạn đến với tài liệu hướng dẫn kỹ thuật của **Tastee Backend** – Hệ thống RESTful API kết hợp Học máy (Machine Learning) hỗ trợ lập kế hoạch dinh dưỡng và gợi ý món ăn cá nhân hóa thông minh.

Dự án này được thiết kế theo kiến trúc Modular sạch sẽ, tối giản và hiệu năng cao sử dụng **Express.js**, **PostgreSQL** (không ORM) và tích hợp mô hình **NGCF (Neural Graph Collaborative Filtering)** để tính toán độ tương đồng món ăn.

Tài liệu này được biên soạn đầy đủ để phục vụ cả việc **triển khai Backend trên máy chủ mới** và **tích hợp Client (Mobile/Web)** dành cho lập trình viên.

👉 **Swagger UI dùng thử trực tiếp:** [http://localhost:3000/docs](http://localhost:3000/docs) (Đã được tối ưu hóa tương thích bảo mật)

---

## 📁 1. Cấu trúc Mã nguồn Dự án (Directory Structure)

Hệ thống được tổ chức theo kiến trúc **Modular 2-layer** (`routes ➡️ service`) giúp phân tách nghiệp vụ rõ ràng, dễ dàng mở rộng và bảo trì:

```
tastee-backend/
├── Model/
│   └── ngcf_baseline.pth        # File weights của mô hình ML NGCF (Không track Git)
├── data/
│   ├── RAW_recipes.csv          # Dữ liệu món ăn gốc từ Food.com (Không track Git)
│   └── PP_recipes.csv           # Dữ liệu map index từ Food.com (Không track Git)
├── sql/
│   └── init.sql                 # Tập lệnh khởi tạo cấu trúc cơ sở dữ liệu PostgreSQL
├── scripts/
│   ├── extract_embeddings.py    # [Python] Trích xuất vector embedding từ file .pth
│   ├── import-foods.js          # [Node] Import món ăn từ RAW_recipes.csv vào DB
│   ├── import-embeddings.js     # [Node] Map và cập nhật vector embedding vào DB
│   ├── item_embeddings.json     # File vector trung gian dạng JSON (Không track Git)
│   ├── test_all_phases.js       # Script kiểm tra tích hợp toàn bộ các Phase hệ thống
│   ├── test_phase7.js           # Script kiểm tra tích hợp Phase gợi ý món ăn (Recommendation)
│   └── test_phase8.js           # Script kiểm tra tích hợp Phase bảo mật và giới hạn rate limit
├── src/
│   ├── config/
│   │   ├── db.js                # Khởi tạo PostgreSQL connection pool (pg)
│   │   └── swagger.json         # Định nghĩa đặc tả API cho Swagger UI
│   ├── middlewares/
│   │   ├── auth.js              # Kiểm tra quyền truy cập qua JWT Access Token
│   │   ├── error.js             # Xử lý lỗi tập trung toàn hệ thống (Global Error Handler)
│   │   └── rateLimit.js         # Bộ giới hạn tần suất gửi yêu cầu (Rate Limiter)
│   ├── modules/
│   │   ├── auth/                # Module Đăng ký, Đăng nhập, Làm mới Token, Đăng xuất
│   │   ├── users/               # Module Hồ sơ người dùng, Onboarding, Tính toán Macros
│   │   ├── foods/               # Module Tìm kiếm và tra cứu dữ liệu món ăn
│   │   ├── meals/               # Module Lên kế hoạch ăn uống (Meal planning) theo ngày
│   │   ├── summary/             # Module Thống kê tiến trình nạp dinh dưỡng hàng ngày
│   │   └── recommendation/      # Module Thuật toán gợi ý Hybrid (Similarity + Tag Boost)
│   ├── utils/
│   │   ├── errors.js            # Lớp tùy biến mã lỗi hệ thống (AppError)
│   │   ├── jwt.js               # Ký và xác thực JWT (Access & Refresh Token)
│   │   ├── nutrition.js         # Tiện ích tính toán chỉ số BMR, TDEE, Calo & Targets
│   │   └── response.js          # Tiêu chuẩn hóa định dạng phản hồi JSON
│   ├── app.js                   # Cấu hình Express, Middlewares và định tuyến Routes
│   └── server.js                # Entry point khởi chạy server HTTP
├── .env.example                 # File cấu hình biến môi trường mẫu
├── .gitignore                   # Định nghĩa các file bỏ qua không commit lên Git
├── package.json                 # Quản lý thư viện và script Node.js
└── requirements.txt             # Quản lý thư viện Python cho ML script
```

---

## 🛠️ 2. Hướng dẫn cài đặt Backend từ đầu (Setup Guide)

Làm theo các bước sau để chuyển giao và khởi chạy hệ thống trên bất kỳ máy tính mới nào.

### 2.1 Cài đặt các công cụ yêu cầu (Prerequisites)
Đảm bảo máy tính của bạn đã cài đặt sẵn:
- **Node.js** (Phiên bản v18 trở lên)
- **PostgreSQL** (Phiên bản v14 trở lên)
- **Python** (Phiên bản 3.8 trở lên - chỉ cần nếu bạn chạy quy trình ML trích xuất embedding)

---

### 2.2 Các bước thực hiện chi tiết

#### Bước 1: Chuẩn bị mã nguồn và thư mục chứa bộ dữ liệu
1. Clone/Sao chép toàn bộ dự án về máy tính mới.
2. Tạo một thư mục tên là `data` nằm tại thư mục gốc của dự án để chuẩn bị chứa dữ liệu CSV lớn từ Food.com:
   ```bash
   mkdir data
   ```

#### Bước 2: Tải và đặt các file dữ liệu lớn vào đúng chỗ
Do kích thước file lớn, các file sau được bỏ qua không đẩy lên Git. Bạn cần tải chúng về và đặt vào đúng vị trí:
1. Tải bộ dữ liệu Food.com (ví dụ từ Kaggle) gồm:
   - `RAW_recipes.csv` ➡️ Đặt vào thư mục `data/RAW_recipes.csv`
   - `PP_recipes.csv` ➡️ Đặt vào thư mục `data/PP_recipes.csv`
2. Đặt file mô hình NGCF đã được train sẵn:
   - `ngcf_baseline.pth` ➡️ Đặt vào thư mục `Model/ngcf_baseline.pth`

#### Bước 3: Cấu hình biến môi trường `.env`
1. Tạo bản sao từ file ví dụ:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` mới tạo lên và điều chỉnh thông tin kết nối cơ sở dữ liệu PostgreSQL của bạn ở biến `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://[username]:[password]@localhost:5432/tastee_db"
   ```
   *(Thay thế `[username]` và `[password]` bằng tài khoản postgres thực tế của máy bạn)*

#### Bước 4: Cài đặt Dependencies
1. Cài đặt các thư viện Node.js:
   ```bash
   npm install
   ```
2. *(Tùy chọn)* Cài đặt thư viện Python (đối với máy cần xử lý trích xuất ML):
   ```bash
   pip install -r requirements.txt
   ```

#### Bước 5: Khởi tạo Cơ sở dữ liệu (Database Setup)
Khởi tạo cơ sở dữ liệu bằng cách sử dụng PostgreSQL CLI hoặc các phần mềm quản lý như pgAdmin/DBeaver để chạy file script:
```bash
psql -U [username] -d [database_name] -f sql/init.sql
```
*Lưu ý:* File `sql/init.sql` sẽ tự động tạo extension `pgcrypto`, tạo các bảng `users`, `user_profiles`, `foods`, `meal_plans` cùng các ràng buộc khóa ngoại và chỉ mục tìm kiếm tối ưu.

---

## 🤖 3. Quy trình Trích xuất & Import Dữ liệu (ML Pipeline)

Sau khi cơ sở dữ liệu đã sẵn sàng, thực hiện 3 bước sau theo thứ tự để chuẩn bị dữ liệu món ăn và nhúng vector (embeddings) phục vụ thuật toán gợi ý:

### Bước A: Trích xuất Embeddings từ mô hình PyTorch
Chạy script Python để đọc file trọng số `.pth` của mô hình NGCF và xuất ra file JSON dạng `{ "item_index": [vector_64_dimensions] }`:
```bash
python scripts/extract_embeddings.py
```
*Kết quả:* Sẽ tạo ra file `scripts/item_embeddings.json` chứa vector nhúng của món ăn.

### Bước B: Import danh sách món ăn gốc vào Postgres
Chạy script Node.js để stream file CSV món ăn khổng lồ và lưu hàng loạt (batch insert) vào bảng `foods` trong DB:
```bash
node scripts/import-foods.js
```
*Tính năng:* Script tự động map các cột dinh dưỡng chuẩn của Food.com, tối ưu hóa giao dịch (transaction) để đảm bảo toàn vẹn dữ liệu, và có cơ chế bỏ qua trùng lặp (`ON CONFLICT DO NOTHING`) giúp chạy lại an toàn.

### Bước C: Map và cập nhật Embeddings vào Database
Chạy script để ánh xạ vị trí chỉ mục (`i`) từ file `PP_recipes.csv` thành mã `external_id` tương ứng trong DB, sau đó cập nhật mảng vector vào cột `embedding` trong bảng `foods`:
```bash
node scripts/import-embeddings.js
```
*Kết quả:* Tất cả món ăn phù hợp trong database sẽ sở hữu một vector embedding đặc trưng, sẵn sàng cho việc tính toán độ tương đồng cosine trực tiếp trong Postgres.

---

## 🚀 4. Khởi chạy Server

Khi dữ liệu đã sẵn sàng, bạn có thể khởi chạy server backend:

**Môi trường Development (tự động restart khi sửa code):**
```bash
npm run dev
```

**Môi trường Production:**
```bash
npm start
```
Server mặc định lắng nghe tại cổng `3000`. Kiểm tra trạng thái hoạt động:
```bash
curl http://localhost:3000/health
```
*(Phản hồi thành công dạng: `{"success":true,"message":"Tastee API is running"}`)*

---

## 📊 5. Cấu trúc Response chuẩn (Standard Payload)

Tất cả các API của Tastee đều tuân thủ định dạng JSON thống nhất để Frontend dễ dàng viết Parser mẫu (Generic Models).

### 5.1 Cú pháp Thành công (Single Object)
```json
{
  "success": true,
  "data": {
    "id": "7c12850d-d421-4f3b-b27a-e4618e47bf03",
    "name": "Nguyễn Văn A"
  },
  "message": "OK"
}
```

### 5.2 Cú pháp Thành công có Phân trang (Danh sách)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 5.3 Cú pháp Lỗi chuẩn hóa
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Thiếu các thông tin bắt buộc"
  }
}
```

---

## 🔑 6. Quản lý Authentication & Token (JWT Flow)

Hệ thống sử dụng cơ chế bảo mật kép: **Access Token** (hạn ngắn 15 phút) gửi ở Header và **Refresh Token** (hạn dài 7 ngày) gửi ở Body để cấp lại token khi hết hạn.

1. **Đăng nhập / Đăng ký**:
   - `POST /auth/register` (Đăng ký)
   - `POST /auth/login` (Đăng nhập) ➡️ Trả về `accessToken` và `refreshToken`.
2. **Lưu trữ**:
   - Lưu `accessToken` và `refreshToken` vào bộ nhớ an toàn của thiết bị (Android: `EncryptedSharedPreferences`).
3. **Gửi Token**:
   - Đính kèm `accessToken` vào header của các request được bảo vệ:
     `Authorization: Bearer <accessToken>`
4. **Hết hạn Token (HTTP 401)**:
   - Khi nhận mã lỗi `401 Unauthorized` với mã lỗi `TOKEN_EXPIRED`, thực hiện gọi API:
     `POST /auth/refresh` gửi kèm `{ "refreshToken": "..." }`.
   - Lưu lại `accessToken` mới và tự động thực hiện lại (Retry) request bị lỗi trước đó.
   - Nếu gọi Refresh Token bị lỗi `401` tiếp (`REFRESH_TOKEN_INVALID`), điều hướng người dùng về màn hình Đăng nhập (Logout cứng).

---

## 🔄 7. Quy trình Tích hợp Tuần tự (Integration Workflows)

Dưới đây là sơ đồ hướng dẫn tích hợp logic ứng dụng từ lúc mở app đến khi gợi ý món ăn dành cho lập trình viên Client:

### Luồng 1: Khởi động App & Onboarding
```mermaid
sequenceDiagram
    App->>Backend: GET /users/me (Gửi accessToken)
    alt Token Hợp lệ
        Backend-->>App: Trả về Profile (is_onboarding_complete: true/false)
        alt is_onboarding_complete == false
            App->>User: Hiển thị màn hình Onboarding chỉ số cơ thể
            User->>App: Nhập Giới tính, Chiều cao, Cân nặng, Cuisines, Allergies, Diet Tags
            App->>Backend: POST /users/onboarding
            Backend-->>App: Trả về chỉ số Target Calo & Macro tự tính
        else is_onboarding_complete == true
            App->>User: Vào thẳng màn hình Home chính
        end
    else Token Hết hạn / Không có
        App->>User: Hiển thị màn hình Login
    end
```

### Luồng 2: Tra cứu & Lên lịch Ăn uống (Meal Planning)
1. **Tìm món ăn**: `GET /foods/search?q=chicken`
   - Hiển thị danh sách kèm lượng dinh dưỡng (Calories, Protein, Carbs, Fat) trên 100g.
2. **Lên lịch bữa ăn**: `POST /meals`
   - Gửi `{ "foodId", "scheduledAt", "quantityG" }`.
   - Nhận về thông tin bữa ăn đã được lưu kèm lượng dinh dưỡng thực tế tính theo gram (`calories_snap`, v.v.).
3. **Xem lịch trình ngày**: `GET /meals?date=YYYY-MM-DD`
   - Trả về danh sách món ăn đã xếp lịch theo thứ tự thời gian tăng dần.
4. **Xem tổng hợp tiến trình**: `GET /summary/daily?date=YYYY-MM-DD`
   - Trả về báo cáo tiến độ dưới dạng: Đã nạp (`actual`), Cần nạp (`target`), Còn lại (`remaining`) và Tỉ lệ phần trăm (`percentage`). Dùng để vẽ thanh ProgressBar dinh dưỡng ở màn Home.

### Luồng 3: Gợi ý món ăn thông minh (Recommendation)
- Gọi API: `GET /recommend?date=YYYY-MM-DD`
- Backend tự động:
  - Tính khẩu vị của người dùng bằng cách tính trung bình cộng Vector Embedding (Centroid) từ lịch sử ăn uống của họ trước ngày truy vấn.
  - Lọc bỏ 100% món ăn chứa thành phần dị ứng (`allergies`) đã chọn ở màn Onboarding.
  - Cộng điểm ưu tiên cho các món ăn phù hợp với chế độ ăn kiêng (`diet_tags`) và sở thích (`cuisines`).
- Trả về danh sách **20 món ăn gợi ý cá nhân hóa** xếp hạng theo điểm số `score` giảm dần.

---

## 🚨 8. Bảng mã lỗi dùng chung (Shared Error Codes)

Frontend nên cấu hình map các mã lỗi dưới đây để xử lý hành vi hiển thị:

| Mã lỗi (Code) | HTTP Status | Ý nghĩa | Hành động của Frontend |
|---|---|---|---|
| `VALIDATION_ERROR` | `400` | Dữ liệu gửi lên bị thiếu hoặc sai định dạng | Kiểm tra lại dữ liệu nhập từ form / Validate client |
| `EMAIL_ALREADY_EXISTS` | `400` | Email đăng ký đã được sử dụng trước đó | Thông báo: "Email này đã tồn tại trên hệ thống" |
| `ONBOARDING_REQUIRED` | `400` | Truy cập API Meal/Recommend khi chưa làm Onboarding | Tự động chuyển hướng người dùng sang màn Onboarding |
| `TOKEN_INVALID` | `401` | Token xác thực không hợp lệ hoặc sai chữ ký | Điều hướng ra màn hình Đăng nhập |
| `TOKEN_EXPIRED` | `401` | Access Token hết hạn | Gọi API `/auth/refresh` để lấy token mới |
| `REFRESH_TOKEN_INVALID` | `401` | Refresh token hết hạn hoặc giả mạo | Đăng xuất người dùng, yêu cầu đăng nhập lại |
| `NOT_FOUND` | `404` | Món ăn, Bữa ăn hoặc Profile không tồn tại | Thông báo: "Dữ liệu không tồn tại hoặc đã bị xóa" |
| `TOO_MANY_REQUESTS` | `429` | IP gửi quá nhiều request (Bảo vệ Rate limit) | Hiển thị: "Bạn đang thao tác quá nhanh, vui lòng thử lại sau" |
| `INTERNAL_ERROR` | `500` | Lỗi phát sinh trong server | Hiển thị: "Hệ thống đang gặp sự cố, vui lòng thử lại sau" |

---

## 📱 9. Mẹo tích hợp hữu ích dành cho Android (Java/Retrofit)

### 9.1 Cấu hình Header Token tự động bằng OkHttp Interceptor
Thay vì truyền thủ công `@Header("Authorization")` trong mỗi hàm ApiService, hãy cấu hình một `Interceptor` khi khởi tạo `OkHttpClient`:

```java
OkHttpClient okHttpClient = new OkHttpClient.Builder()
    .addInterceptor(chain -> {
        Request original = chain.request();
        
        // Lấy Token đã lưu trong SharedPrefs
        String token = SharedPreferencesHelper.getAccessToken(); 
        
        if (token != null && !token.isEmpty()) {
            Request request = original.newBuilder()
                .header("Authorization", "Bearer " + token)
                .method(original.method(), original.body())
                .build();
            return chain.proceed(request);
        }
        
        return chain.proceed(original);
    })
    .build();
```

### 9.2 Cấu hình Auto-Authenticator để tự động làm mới Token (Refresh Flow)
Sử dụng hàm `.authenticator()` của OkHttp để tự động đón đầu lỗi 401, gọi `/auth/refresh` đồng bộ, lưu token mới và gửi lại request lỗi:

```java
okHttpClientBuilder.authenticator((route, response) -> {
    // 1. Chỉ thực hiện khi nhận mã 401
    if (response.code() == 401) {
        String refreshToken = SharedPreferencesHelper.getRefreshToken();
        
        // Gọi API refresh token đồng bộ
        Call<RefreshResponse> call = apiService.refreshTokenSync(new RefreshRequest(refreshToken));
        retrofit2.Response<RefreshResponse> refreshResponse = call.execute();
        
        if (refreshResponse.isSuccessful() && refreshResponse.body() != null) {
            String newAccessToken = refreshResponse.body().getData().getAccessToken();
            String newRefreshToken = refreshResponse.body().getData().getRefreshToken();
            
            // Lưu token mới
            SharedPreferencesHelper.saveTokens(newAccessToken, newRefreshToken);
            
            // Gửi lại request cũ với Access Token mới
            return response.request().newBuilder()
                .header("Authorization", "Bearer " + newAccessToken)
                .build();
        }
    }
    return null; // Trả về null nếu refresh thất bại -> Chuyển về màn Login
});
```

### 9.3 Ép kiểu dữ liệu Array (TEXT[] và FLOAT[])
Các trường như `cuisines`, `allergies`, `tags` trong Database PostgreSQL trả về dưới dạng JSON Array thông thường (`["vietnamese", "italian"]`).
- Phía Java, bạn khai báo các thuộc tính này dưới dạng `List<String>` hoặc `String[]`.
- Đối với trường độ tương đồng trong Recommend, hãy ép sang kiểu `Double` hoặc `Float` để tránh mất mát dữ liệu phần thập phân.
