// server/models/Listing.model.js
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    // ── Who created this listing ──────────────────────────────────────
    farmer: {
      type: mongoose.Schema.Types.ObjectId, // stores a reference (ID) to the User document
      ref: 'User',                          // tells Mongoose "this ID belongs to the User model"
      required: [true, 'Farmer is required'],
    },

    // ── Basic info ────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Vegetables', 'Fruits', 'Grains & Cereals',
        'Dairy', 'Livestock', 'Poultry',
        'Herbs & Spices', 'Farm Services', 'Other',
      ],
    },

    // ── Pricing ───────────────────────────────────────────────────────
    pricePerUnit: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: ['kg', 'g', 'litre', 'ml', 'dozen', 'piece', 'bag', 'bundle'],
    },

    // ── Stock ─────────────────────────────────────────────────────────
    quantityAvailable: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },

    // ── KEY FEATURE: When will this product be ready? ─────────────────
    // Farmers can list upcoming harvests BEFORE they are ready
    estimatedAvailableDate: {
      type: Date,
      required: [true, 'Estimated availability date is required'],
    },

    // ── Images (stored as Cloudinary URLs) ────────────────────────────
    images: {
      type: [String], // array of URL strings
      default: [],
    },

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'inactive'],
      default: 'available',
    },

    // ── Location ──────────────────────────────────────────────────────
    location: {
      address: { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
      pincode: { type: String, default: '' },
    },

    // ── AI suggested price (stored when farmer requests AI suggestion) ─
    aiSuggestedPrice: {
      type: Number,
      default: null,
    },

    // ── Tags for search ───────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
    },

    // ── Aggregated rating (updated when reviews are added) ────────────
    rating: {
      average: { type: Number, default: 0 },
      count:   { type: Number, default: 0 },
    },

    // ── How many times this listing was viewed ────────────────────────
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // auto adds createdAt + updatedAt
  }
);

// ── Indexes for fast queries ──────────────────────────────────────────
// WHY: Without indexes, MongoDB scans EVERY document to find matches.
// With indexes, it uses a B-tree structure — like a book's index — much faster.
listingSchema.index({ farmer: 1 });                    // fast: "get all listings by this farmer"
listingSchema.index({ category: 1 });                  // fast: "get all vegetable listings"
listingSchema.index({ status: 1 });                    // fast: "get all available listings"
listingSchema.index({ estimatedAvailableDate: 1 });    // fast: "listings ready by next month"
listingSchema.index({ title: 'text', description: 'text', tags: 'text' }); // full-text search

module.exports = mongoose.model('Listing', listingSchema);