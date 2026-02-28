# Shop Hàng Tết API - Node.js Express Backend

## Mô tả
Port từ backend C# (.NET 9) sang Node.js (v22+) với Express, giữ nguyên tất cả API endpoints, models, services, và logic nghiệp vụ.

## Công nghệ
- **Runtime:** Node.js 22+
- **Framework:** Express 4
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (jsonwebtoken)
- **Email:** Nodemailer
- **OTP Cache:** node-cache

## Cấu trúc thư mục

```
back-end-nodejs/
├── src/
│   ├── server.js            # Entry point (tương đương Program.cs)
│   ├── controllers/         # Express routes (tương đương Controllers/)
│   │   ├── authController.js
│   │   ├── productsController.js
│   │   ├── ordersController.js
│   │   └── systemController.js
│   ├── models/              # Mongoose schemas (tương đương Models/)
│   │   ├── enums.js
│   │   ├── userModel.js
│   │   ├── productModels.js
│   │   ├── orderModel.js
│   │   ├── cartModel.js
│   │   ├── deliverySlot.js
│   │   └── supportModels.js
│   ├── services/            # Business logic (tương đương Services/)
│   │   ├── jwtService.js
│   │   ├── otpService.js
│   │   ├── emailService.js
│   │   └── orderService.js
│   ├── repositories/        # Data access (tương đương Repositories/)
│   │   └── deliverySlotRepository.js
│   ├── middlewares/          # Express middlewares
│   │   └── authMiddleware.js
│   ├── dtos/                # DTOs & validation helpers
│   │   └── masterDTOs.js
│   └── data/                # Database connection & seed
│       ├── dbContext.js
│       └── seedData.js
├── .env
├── Dockerfile
├── package.json
└── README.md
```

## API Endpoints (giống hệt bản C#)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/products/items` | Lấy danh sách items |
| GET | `/api/products/gift-boxes` | Lấy danh sách hộp quà |
| GET | `/api/products/collections` | Lấy danh sách bộ sưu tập |
| POST | `/api/orders/b2c` | Tạo đơn hàng B2C |
| POST | `/api/orders/b2b` | Tạo đơn hàng B2B (cần login) |
| GET | `/api/orders/track` | Tra cứu đơn hàng |
| GET | `/api/orders/my-orders` | Lấy đơn hàng của user |
| PUT | `/api/orders/:orderId/status` | Cập nhật trạng thái (STAFF) |
| POST | `/api/orders/validate-mixmatch/:id` | Validate Mix & Match |
| GET | `/api/system/health` | Health check |
| POST | `/api/system/test-jwt` | Test JWT generation |
| POST | `/api/system/test-otp` | Test OTP generation |

## Cài đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development (auto-reload)
npm run dev

# Chạy production
npm start
```

## Docker

```bash
docker build -t shop-hang-tet-nodejs .
docker run -p 5000:5000 --env-file .env shop-hang-tet-nodejs
```

## Environment Variables
Xem file `.env` để cấu hình MongoDB, JWT, SMTP, v.v.
