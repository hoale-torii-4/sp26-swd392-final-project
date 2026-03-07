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
├── .env                  # Config mặc định
├── .env.development      # Config Development (tương ứng appsettings.Development.json)
├── .env.production       # Config Production (tương ứng appsettings.Production.json)
├── .gitignore
├── .dockerignore
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

# Chạy development (auto-reload, load .env.development)
npm run dev

# Chạy production (load .env.production)
NODE_ENV=production npm start
```

## Environment Config

Hệ thống load `.env` theo cơ chế giống `appsettings.{Environment}.json` bên C#:

1. `.env.{NODE_ENV}` (VD: `.env.development`, `.env.production`) — ưu tiên trước
2. `.env` — giá trị mặc định, bổ sung các biến chưa có

### Các biến quan trọng

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Tên database | `ShopHangTetDb` |
| `JWT_SECRET_KEY` | Secret key cho JWT | *(xem .env)* |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | Email username | *(xem .env)* |
| `SMTP_PASSWORD` | Email password | *(xem .env)* |
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGINS` | Danh sách CORS (phân cách `,`) | `http://localhost:5173,http://localhost:3000` |

## Docker

```bash
# Build image
docker build -t shop-hang-tet-nodejs .

# Run container  
docker run -p 5001:5001 --env-file .env shop-hang-tet-nodejs

# Chạy cùng docker-compose (từ thư mục gốc project)
docker compose up backend-nodejs
```
