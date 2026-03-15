import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env theo environment (tương tự appsettings.{Environment}.json)
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = resolve(rootDir, `.env.${nodeEnv}`);
if (existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`📦 Loaded environment: .env.${nodeEnv}`);
}
// Load .env gốc (các giá trị chưa có sẽ được bổ sung)
dotenv.config({ path: resolve(rootDir, '.env') });

import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './data/dbContext.js';
import { seedDatabase } from './data/seedData.js';

import {
  JwtService,
  OtpService,
  EmailService,
  OrderService,
  CartService,
  ProductService,
  AiService,
  OrderExpirationService,
} from './services/index.js';
import { DeliverySlotRepository } from './repositories/index.js';

import {
  createAuthRouter,
  createProductsRouter,
  createOrdersRouter,
  createSystemRouter,
  createCartRouter,
  createPaymentRouter,
  createAiRouter,
  createAddressRouter,
  createAdminCollectionsRouter,
  createAdminGiftBoxesRouter,
  createAdminInventoryRouter,
  createMixMatchRouter,
  createReviewsRouter,
  createAdminUsersRouter,
  createAdminDashboardRouter,
  createReportsRouter,
} from './controllers/index.js';

async function main() {
  const app = express();
  const PORT = process.env.PORT || 5001;

  // ========== Middleware ==========
  app.use(express.json());

  // CORS - Tương đương AllowVueApp policy
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
      credentials: true,
    })
  );

  // ========== Swagger / OpenAPI ==========
  if (process.env.NODE_ENV !== 'production') {
    const swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Shop Hàng Tết API',
          version: '1.0.0',
          description: 'Shop Hàng Tết API - Node.js Express Backend',
        },
        servers: [{ url: `http://localhost:${PORT}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      apis: [], // Có thể thêm JSDoc annotations sau
    });

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Shop Hàng Tết API Docs',
    }));
  }

  // ========== Database ==========
  await connectDatabase();

  // ========== Init Services (Dependency Injection) ==========
  const jwtService = new JwtService();
  const otpService = new OtpService();
  const emailService = new EmailService();
  const deliverySlotRepository = new DeliverySlotRepository();
  const orderService = new OrderService(deliverySlotRepository);
  const cartService = new CartService();
  const productService = new ProductService();
  const aiService = new AiService(process.env.OPENROUTER_API_KEY);
  const orderExpirationService = new OrderExpirationService();

  // ========== Routes (Controllers) ==========
  app.use('/api/auth', createAuthRouter(jwtService, emailService));
  app.use('/api/products', createProductsRouter(productService));
  app.use('/api/orders', createOrdersRouter(orderService, emailService));
  app.use('/api/system', createSystemRouter(jwtService, otpService, emailService));
  app.use('/api/cart', createCartRouter(cartService));
  app.use('/api/payment', createPaymentRouter(orderService, app));
  app.use('/api/ai', createAiRouter(aiService));
  app.use('/api/address', createAddressRouter());
  app.use('/api', createMixMatchRouter());
  app.use('/api', createReviewsRouter());
  app.use('/api/admin/collections', createAdminCollectionsRouter());
  app.use('/api/admin/giftboxes', createAdminGiftBoxesRouter(productService));
  app.use('/api/admin/inventory', createAdminInventoryRouter());
  app.use('/api/admin/users', createAdminUsersRouter());
  app.use('/api/admin/dashboard', createAdminDashboardRouter());
  app.use('/api/admin/reports', createReportsRouter());

  // ========== Seed Data ==========
  await seedDatabase();

  // ========== Start Background Services ==========
  orderExpirationService.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    orderExpirationService.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    orderExpirationService.stop();
    process.exit(0);
  });

  // ========== Start Server ==========
  app.listen(PORT, () => {
    console.log(`\n🚀 Shop Hàng Tết API is running on http://localhost:${PORT}`);
    console.log(`📋 API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/system/health\n`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
