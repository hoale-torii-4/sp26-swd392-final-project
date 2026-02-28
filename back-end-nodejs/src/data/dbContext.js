import mongoose from 'mongoose';

/**
 * Kết nối MongoDB - Tương đương DbContext.cs
 * Hỗ trợ retry khi chạy trong Docker (MongoDB container có thể chưa sẵn sàng)
 */
export async function connectDatabase(maxRetries = 5, retryDelay = 3000) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'ShopHangTetDb';
  const connectionString = `${mongoUri}/${dbName}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`----> MongoDB connected: ${connectionString}`);
      return;
    } catch (error) {
      console.warn(`MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) {
        console.error('MongoDB connection failed after all retries. Exiting.');
        process.exit(1);
      }
      console.log(`Retrying in ${retryDelay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}
