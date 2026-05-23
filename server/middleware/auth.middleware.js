// server/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { errorResponse } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    // Get token from httpOnly cookie
    const token = req.cookies.jwt;

    if (!token) {
      return errorResponse(res, 401, 'Not authorized, please login');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return errorResponse(res, 401, 'User no longer exists');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Not authorized, token failed');
  }
};

module.exports = { protect };