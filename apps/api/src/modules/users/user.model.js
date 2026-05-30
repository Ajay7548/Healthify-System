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

// Word search across name and email backs the admin user search. A regex-prefix
// fallback (in the repository) handles partial typeahead the text index can't.
userSchema.index({ fullName: 'text', email: 'text' });

export const User = model('User', userSchema);
