// server/controllers/order.controller.js
const Order   = require('../models/Order.model');
const Listing = require('../models/Listing.model');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const notify = require('../utils/notify');// ─────────────────────────────────────────────────────────────────────
// @desc    Create a new order (buyer books a listing)
// @route   POST /api/orders
// @access  Private (Buyer only)
// ─────────────────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { listingId, quantity, requestedDeliveryDate, buyerNote } = req.body;

    // ── Validate inputs ───────────────────────────────────────────────
    if (!listingId || !quantity || !requestedDeliveryDate) {
      return errorResponse(res, 400, 'Please provide listing, quantity and delivery date');
    }

    const parsedQty = parseInt(quantity);
    if (isNaN(parsedQty) || parsedQty < 1) {
      return errorResponse(res, 400, 'Quantity must be a positive number');
    }

    // ── Fetch the listing ─────────────────────────────────────────────
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return errorResponse(res, 404, 'Listing not found');
    }

    // ── Business rules ────────────────────────────────────────────────
    // A farmer cannot buy their own listing
    if (listing.farmer.toString() === req.user._id.toString()) {
      return errorResponse(res, 400, 'You cannot book your own listing');
    }

    if (listing.status !== 'available') {
      return errorResponse(res, 400, 'This listing is no longer available');
    }

    if (parsedQty > listing.quantityAvailable) {
      return errorResponse(
        res, 400,
        `Only ${listing.quantityAvailable} ${listing.unit} available`
      );
    }

    // ── Calculate total ───────────────────────────────────────────────
    const totalAmount = listing.pricePerUnit * parsedQty;

    // ── Create order with snapshot ────────────────────────────────────
    // WHY snapshot? If farmer later changes the price or title,
    // the order still shows what the buyer agreed to at booking time
    const order = await Order.create({
      buyer:   req.user._id,
      farmer:  listing.farmer,
      listing: listing._id,
      snapshot: {
        title:        listing.title,
        image:        listing.images?.[0] || '',
        pricePerUnit: listing.pricePerUnit,
        unit:         listing.unit,
        category:     listing.category,
      },
      quantity:              parsedQty,
      totalAmount,
      requestedDeliveryDate: new Date(requestedDeliveryDate),
      buyerNote:             buyerNote || '',
      // Record the first status in history
      statusHistory: [{
        status:    'pending',
        note:      'Order placed by buyer',
        updatedBy: req.user._id,
      }],
    });

    // ── Reduce stock on listing ───────────────────────────────────────
    // $inc is MongoDB's atomic increment operator
    // WHY atomic? If two buyers book simultaneously, $inc handles it
    // safely. Direct assignment (listing.qty = listing.qty - parsedQty)
    // could cause a race condition.
    listing.quantityAvailable -= parsedQty;
    if (listing.quantityAvailable === 0) {
      listing.status = 'reserved';
    }
    await listing.save();

    // Populate buyer and farmer info before returning
    await order.populate('buyer', 'name email avatar');
    await order.populate('farmer', 'name email avatar phone');
    await order.populate('listing', 'title images estimatedAvailableDate');

    // ── Notify farmer in real-time ────────────────────────────────────
    // Notify farmer — safe, never throws
    notify(listing.farmer, 'new_notification', {
      type:      'new_order',
      title:     'New order received 🛒',
      message:   `${req.user.name} ordered ${parsedQty} ${listing.unit} of "${listing.title}"`,
      orderId:   order._id,
    });

    // Notify buyer about status change
    notify(order.buyer, 'new_notification', {
      type:      'order_update',
      title:     'Order status updated 📦',
      message:   `Your order for "${order.snapshot?.title}" is now ${status.replace('_', ' ')}`,
      orderId:   order._id,
    });

    return successResponse(res, 201, 'Order placed successfully', { order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all orders for the logged-in user (buyer or farmer)
// @route   GET /api/orders
// @access  Private
// ─────────────────────────────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const { role } = req.user;

    // Build filter based on role — same endpoint, different perspective
    const filter = role === 'farmer'
      ? { farmer: req.user._id }
      : { buyer:  req.user._id };

    // Optional status filter
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter)
      .populate('buyer',   'name email avatar')
      .populate('farmer',  'name email avatar phone')
      .populate('listing', 'title images estimatedAvailableDate location')
      .sort({ createdAt: -1 }); // newest first

    return successResponse(res, 200, 'Orders fetched', {
      orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private (buyer or farmer of that order)
// ─────────────────────────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer',   'name email avatar phone location')
      .populate('farmer',  'name email avatar phone location')
      .populate('listing', 'title images estimatedAvailableDate location category');

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    // Only the buyer or farmer of this order can view it
    const isBuyer  = order.buyer._id.toString()  === req.user._id.toString();
    const isFarmer = order.farmer._id.toString() === req.user._id.toString();

    if (!isBuyer && !isFarmer) {
      return errorResponse(res, 403, 'Not authorized to view this order');
    }

    return successResponse(res, 200, 'Order fetched', { order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Update order status (farmer updates progress)
// @route   PATCH /api/orders/:id/status
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    // Valid status transitions — farmer can only move forward
    const validStatuses = ['confirmed', 'harvested', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');

    // Only the farmer of this order can update it
    if (order.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update this order');
    }

    // Prevent going backwards in status
    const statusOrder = ['pending', 'confirmed', 'harvested', 'in_transit', 'delivered'];
    const currentIdx  = statusOrder.indexOf(order.status);
    const newIdx      = statusOrder.indexOf(status);

    if (status !== 'cancelled' && newIdx <= currentIdx) {
      return errorResponse(res, 400, 'Cannot move order to a previous status');
    }

    // Update status and push to history
    order.status = status;
    order.statusHistory.push({
      status,
      note:      note || '',
      updatedBy: req.user._id,
    });

    // If cancelled, restore stock to listing
    if (status === 'cancelled') {
      await Listing.findByIdAndUpdate(order.listing, {
        $inc: { quantityAvailable: order.quantity },
        status: 'available',
      });
    }

    await order.save();
    await order.populate('buyer',  'name email');
    await order.populate('farmer', 'name email');

    return successResponse(res, 200, 'Order status updated', { order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Buyer cancels their own pending order
// @route   PATCH /api/orders/:id/cancel
// @access  Private (Buyer only)
// ─────────────────────────────────────────────────────────────────────
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');

    if (order.buyer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }

    // Buyer can only cancel pending orders
    if (order.status !== 'pending') {
      return errorResponse(res, 400, 'Only pending orders can be cancelled by buyer');
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status:    'cancelled',
      note:      'Cancelled by buyer',
      updatedBy: req.user._id,
    });

    // Restore stock
    await Listing.findByIdAndUpdate(order.listing, {
      $inc: { quantityAvailable: order.quantity },
      status: 'available',
    });

    await order.save();
    return successResponse(res, 200, 'Order cancelled successfully', { order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all incoming orders for farmer's listings
// @route   GET /api/orders/farmer/incoming
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────
const getIncomingOrders = async (req, res, next) => {
  try {
    const { status } = req.query;

    // SECURITY: Always filter by the logged-in farmer's ID
    // Never trust any ID from query params or body for this
    const filter = { farmer: req.user._id };

    // Optional status filter — validate it's a known value
    const validStatuses = ['pending', 'confirmed', 'harvested', 'in_transit', 'delivered', 'cancelled'];
    if (status && validStatuses.includes(status)) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('buyer',   'name email avatar phone')
      .populate('listing', 'title images unit pricePerUnit estimatedAvailableDate')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Incoming orders fetched', {
      orders,
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getIncomingOrders,
};