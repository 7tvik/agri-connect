// server/middleware/role.middleware.js
const { errorResponse } = require('../utils/apiResponse');

// Usage: authorizeRoles('farmer', 'admin')
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Role '${req.user.role}' is not allowed to access this route`
      );
    }
    next();
  };
};

// Verify the logged-in farmer owns a specific order
// Usage: after protect middleware on any order route
const verifyOrderOwnership = async (req, res, next) => {
  try {
    const Order = require('../models/Order.model');
    const order = await Order.findById(req.params.id);

    if (!order) {
      return require('../utils/apiResponse').errorResponse(res, 404, 'Order not found');
    }

    const userId = req.user._id.toString();
    const isBuyer  = order.buyer.toString()  === userId;
    const isFarmer = order.farmer.toString() === userId;

    if (!isBuyer && !isFarmer) {
      return require('../utils/apiResponse').errorResponse(
        res, 403, 'You do not have access to this order'
      );
    }

    req.order = order; // attach to request so controller doesn't re-fetch
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authorizeRoles, verifyOrderOwnership };