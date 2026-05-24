// server/models/Order.model.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // ── Who is involved ───────────────────────────────────────────────
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer is required'],
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing is required'],
    },

    // ── What was ordered ──────────────────────────────────────────────
    // WHY snapshot? The listing price might change after booking.
    // We store the price AT THE TIME OF ORDER so the bill is accurate forever.
    snapshot: {
      title:        { type: String, required: true },
      image:        { type: String, default: '' },
      pricePerUnit: { type: Number, required: true },
      unit:         { type: String, required: true },
      category:     { type: String, required: true },
    },

    quantity:    { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    totalAmount: { type: Number, required: true, min: [0] },

    // ── Dates ─────────────────────────────────────────────────────────
    requestedDeliveryDate: { type: Date, required: true },

    // ── Status lifecycle ──────────────────────────────────────────────
    // This is the heart of order tracking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'harvested', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending',
    },

    // ── Status history (for timeline UI) ─────────────────────────────
    // Every time status changes, we push a record here
    // WHY? So buyers can see: "confirmed at 2pm, harvested at 8am next day..."
    statusHistory: [
      {
        status:    { type: String },
        note:      { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ── Payment ───────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'released', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String, default: '' },

    // ── Notes ─────────────────────────────────────────────────────────
    buyerNote:  { type: String, default: '', maxlength: 500 },
    farmerNote: { type: String, default: '', maxlength: 500 },

    // ── Review flag ───────────────────────────────────────────────────
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ listing: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);