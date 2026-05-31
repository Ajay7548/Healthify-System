import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional: clients imported from a dataset have no portal login until one is
    // granted. The login path rejects credential-less accounts (see auth.service).
    passwordHash: { type: String, default: null },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', required: true, index: true },
    // The source dataset's client_id. Sparse-unique so seeded users (no clientId)
    // don't collide while imported clients stay de-duplicated across re-imports.
    clientId: { type: Number, default: null },
    // Demographics from the clients sheet — power the admin filters and insights.
    mobile: { type: String, default: null },
    city: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
    age: { type: Number, default: null },
    gender: { type: String, default: null, trim: true },
    occupation: { type: String, default: null, trim: true },
    healthCondition: { type: String, default: null, trim: true },
    beautyGoal: { type: String, default: null, trim: true },
    // Medical record number — optional external identifier (legacy/seeded accounts).
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
// Stable identity for an imported client (idempotent re-import).
userSchema.index({ clientId: 1 }, { unique: true, sparse: true });
// Back the faceted demographic filters so they stay index-supported at 5k+ rows.
userSchema.index({ healthCondition: 1 });
userSchema.index({ state: 1 });
userSchema.index({ gender: 1 });
userSchema.index({ age: 1 });

export const User = model('User', userSchema);
