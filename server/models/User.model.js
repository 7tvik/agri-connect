// server/models/User.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password in queries by default
    },
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'admin'],
      default: 'buyer',
    },
    avatar: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: '',
    },
    location: {
      address: { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    rating: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ── Indexes ──────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ── Hash password before saving ──────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: compare password ───────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Remove sensitive fields from JSON output ─────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);