import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', required: true, index: true },
    // Medical record number — optional external identifier.
    mrn: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Indexes for the admin list: createdAt backs the default (newest-first) sort,
// fullName backs the alphabetical sort. Substring search uses a case-insensitive
// regex over name/email — fine at this scale; MongoDB Atlas Search would be the
// production path once the user table grows large.
userSchema.index({ createdAt: -1 });
userSchema.index({ fullName: 1 });

export const User = model('User', userSchema);
