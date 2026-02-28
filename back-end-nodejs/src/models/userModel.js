import mongoose from 'mongoose';
import { UserRole, UserStatus } from './enums.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, default: '' },
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MEMBER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    // OTP verification
    otpCode: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);

// ========== Address Model ==========
const addressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    receiverName: { type: String, default: '' },
    receiverPhone: { type: String, default: '' },
    fullAddress: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Address = mongoose.model('Address', addressSchema);
