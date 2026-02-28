import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './data/dbContext.js';
import { seedDatabase } from './data/seedData.js';

import { JwtService, OtpService, EmailService, OrderService } from './services/index.js';
import { DeliverySlotRepository } from './repositories/index.js';

import {
  createAuthRouter,
  createProductsRouter,
  createOrdersRouter,
  createSystemRouter,
} from './controllers/index.js';

async function main() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  // ========== Middleware ==========
  app.use(express.json());

  // CORS - Tương đương AllowVueApp policy
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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

  // ========== Routes (Controllers) ==========
  app.use('/api/auth', createAuthRouter(jwtService));
  app.use('/api/products', createProductsRouter());
  app.use('/api/orders', createOrdersRouter(orderService, emailService));
  app.use('/api/system', createSystemRouter(jwtService, otpService, emailService));

  // ========== Seed Data ==========
  await seedDatabase();

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
