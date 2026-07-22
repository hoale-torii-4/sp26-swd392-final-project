# 🌸 LỘC XUÂN - Hệ Thống Bán Hàng & Tự Phối Giỏ Quà Tết Trực Tuyến

> **Đồ án môn SWD392** | Application Architecture & Development  
> **Live Demo:** [https://shoplocxuan.onrender.com](https://shoplocxuan.onrender.com)

---

## 📌 Giới thiệu dự án

**Lộc Xuân** là hệ thống thương mại điện tử đa nền tảng (Web & Mobile) dành riêng cho dịp Tết Nguyên Đán. Hệ thống không chỉ cung cấp các sản phẩm quà Tết, giỏ quà Tết cao cấp sẵn có mà còn mang đến tính năng **Tự phối giỏ quà (Mix & Match)** giúp người dùng tự tay chọn lựa vật phẩm, thiệp chúc mừng, hộp quà theo ý thích. Đội ngũ phát triển còn tích hợp **Trợ lý AI tư vấn** thông minh hỗ trợ khách hàng tìm kiếm giỏ quà phù hợp nhất với ngân sách và đối tượng nhận quà.

---

## ✨ Tính năng nổi bật

### 🛒 Khách Hàng (Customer)
* **Khám phá sản phẩm & Giỏ quà Tết:** Danh mục quà Tết đa dạng, hiển thị chi tiết vật phẩm, giá cả và hình ảnh chất lượng cao.
* **Tự phối giỏ quà (Mix & Match):** Khách hàng tự chọn loại hộp, các sản phẩm đi kèm, tùy chỉnh thiệp chúc Tết và xem trước tổng chi phí theo thời gian thực.
* **Trợ lý AI tư vấn (AI Assistant):** Chatbot AI giải đáp thắc mắc và gợi ý giỏ quà phù hợp theo ngân sách, mục đích (biếu người thân, đối tác, doanh nghiệp).
* **Đặt hàng & Khung giờ giao hàng:** Lựa chọn ngày/khung giờ giao hàng (Delivery Slots) linh hoạt trong dịp cao điểm Tết.
* **Thanh toán tự động qua SePay:** Tích hợp Webhook SePay giúp tự động xác nhận giao dịch chuyển khoản ngân hàng qua QR Code ngay lập tức.
* **Theo dõi đơn hàng & Lịch sử mua hàng:** Cập nhật trạng thái đơn hàng chi tiết theo thời gian thực.

### 🛡️ Quản trị viên & Nhân viên (Admin & Staff)
* **Quản lý sản phẩm & Giỏ quà:** Thêm, sửa, xóa, dán nhãn sản phẩm Tết, tạo mới các bộ sưu tập quà Tết.
* **Quản lý đơn hàng:** Tiếp nhận, cập nhật trạng thái xử lý, vận chuyển và hoàn tất đơn hàng.
* **Quản lý người dùng:** Phân quyền hệ thống (Admin, Staff, Customer).
* **Quản lý khung giờ giao hàng (Delivery Slots):** Cấu hình giới hạn số lượng đơn hàng per slot để đảm bảo năng lực giao vận.

### 📱 Ứng dụng Di động (Mobile App)
* Đầy đủ tính năng mua sắm, phối giỏ quà, đặt hàng và theo dõi đơn hàng được tối ưu giao diện trên iOS & Android.

---

## 🛠️ Kiến trúc & Công nghệ (Tech Stack)

### 1. Frontend Web
* **Framework:** React 19 + TypeScript + Vite
* **Styling:** Tailwind CSS v4 + FontAwesome Icons
* **Routing & State:** React Router v7, Axios, Formik + Yup
* **Deployment:** Render Static Site

### 2. Mobile Application
* **Framework:** React Native + TypeScript
* **Platform:** Expo SDK 55 + Expo Router v6
* **UI Components:** React Native Reanimated, Expo Vector Icons, React Native Toast Message

### 3. Backend API (.NET)
* **Framework:** .NET 9 Web API
* **Database:** MongoDB (Sử dụng `MongoDB.EntityFrameworkCore` & `MongoDB.Driver`)
* **Authentication:** JWT (JSON Web Token) + Google OAuth 2.0
* **API Documentation:** Scalar API / OpenAPI
* **Deployment:** Render Web Service (Docker / Dotnet Runtime)

### 4. Backend Alternative (Node.js - Microservice)
* **Runtime:** Node.js + Express.js
* **Database:** MongoDB + Mongoose ORM

### 5. Tích hợp bên thứ ba (Third-party Services)
* **SePay Webhook:** Tự động hóa xác nhận thanh toán ngân hàng qua mã QR.
* **Brevo API (Sendinblue):** Gửi email thông báo đơn hàng, mã xác thực email.
* **LLM API / Gemini (Vilao AI):** Cung cấp trí tuệ nhân tạo cho Trợ lý AI tư vấn quà Tết.

---

## 📁 Cấu trúc thư mục (Project Structure)

```text
sp26-swd392-final-project/
├── back-end/                 # Backend chính phát triển bằng .NET 9 Web API
│   └── ShopHangTet/          # Source code .NET Web API & MongoDB Entity Framework
├── back-end-nodejs/          # Backend phụ/Microservice phát triển bằng Node.js + Express
├── front-end/                # Frontend Web Application (React 19 + Vite + TailwindCSS)
├── mobile-app/               # Mobile Application (React Native + Expo SDK 55)
├── render.yaml               # Cấu hình triển khai tự động trên Render Cloud
└── README.md                 # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng dẫn cài đặt & Chạy cục bộ (Local Development)

### 📋 Yêu cầu tiền đề (Prerequisites)
* Node.js >= 20.x
* .NET SDK >= 9.0
* MongoDB (Cục bộ hoặc MongoDB Atlas URI)
* Expo Go app trên điện thoại hoặc Android Studio / iOS Simulator (để chạy Mobile App)

---

### 1. Khởi chạy Backend (.NET API)

```bash
cd back-end/ShopHangTet

# Cấu hình chuỗi kết nối MongoDB trong appsettings.json hoặc appsettings.Development.json
# Sau đó khôi phục dependencies và chạy project:
dotnet restore
dotnet run
```
> API sẽ khởi chạy tại: `http://localhost:5000` (hoặc cổng cấu hình trong `launchSettings.json`).  
> Tài liệu API Scalar/Swagger có thể truy cập tại: `http://localhost:5000/scalar/v1`

---

### 2. Khởi chạy Frontend Web

```bash
cd front-end

# Cài đặt thư viện
npm install

# Tạo file .env.local và cấu hình API Base URL:
# VITE_API_BASE_URL=http://localhost:5000/api

# Khởi chạy môi trường Dev:
npm run dev
```
> Ứng dụng Web sẽ chạy tại: `http://localhost:5173`

---

### 3. Khởi chạy Mobile App (Expo)

```bash
cd mobile-app

# Cài đặt thư viện
npm install

# Khởi chạy Expo Dev Server:
npx expo start --clear
```
> Quét mã QR bằng ứng dụng **Expo Go** trên thiết bị di động hoặc nhấn `a` để mở trên Android Emulator.

---

## 🌐 Môi trường triển khai (Live Deployment)

| Thành phần | Đường dẫn Live |
| :--- | :--- |
| **Web Application** | [https://shoplocxuan.onrender.com](https://shoplocxuan.onrender.com) |
| **Backend API Service** | [https://shophangtet-api.onrender.com](https://shophangtet-api.onrender.com) |

---

## 👥 Thành viên nhóm thực hiện (SWD392 Team)

* Đồ án thuộc môn học **SWD392 - Software Architecture and Design**.
* Được xây dựng và hoàn thiện bởi tập thể sinh viên chuyên ngành Software Engineering.

---
*© 2026 Lộc Xuân - SWD392 Final Project. All rights reserved.*