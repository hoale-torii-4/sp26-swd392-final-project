# ============================================
# Shop Hàng Tết API - Node.js Backend
# Multi-stage Docker build
# ============================================

# Stage 1: Install dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Production image
FROM node:22-alpine AS production

# Tạo non-root user cho bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependencies từ stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json ./
COPY src ./src

# Chuyển sang non-root user
USER appuser

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/system/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
