// server/models/Message.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // conversationId = sorted combination of two user IDs
    // WHY sorted? So farmer+buyer and buyer+farmer give the SAME ID
    // We generate this as: [userId1, userId2].sort().join('_')
    conversationId: {
      type:     String,
      required: true,
      index:    true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    receiver: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    content: {
      type:      String,
      required:  [true, 'Message content is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      trim:      true,
    },
    isRead: {
      type:    Boolean,
      default: false,
    },
    // Optional: link message to a listing or order for context
    relatedListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Listing',
      default: null,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Order',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);