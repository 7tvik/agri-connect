// server/controllers/auth.controller.js
const User = require('../models/User.model');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ── @desc    Register new user
// ── @route   POST /api/auth/register
// ── @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'Email already registered');
    }

    // Only allow farmer or buyer on registration — not admin
    const allowedRoles = ['farmer', 'buyer'];
    const userRole = allowedRoles.includes(role) ? role : 'buyer';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
    });

    // Generate JWT and set cookie
    generateToken(res, user._id);

    return successResponse(res, 201, 'Registration successful', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Login user
// ── @route   POST /api/auth/login
// ── @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check if user registered with Google (no password)
    if (!user.password) {
      return errorResponse(res, 401, 'Please login with Google');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated');
    }

    // Generate JWT and set cookie
    generateToken(res, user._id);

    return successResponse(res, 200, 'Login successful', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Logout user
// ── @route   POST /api/auth/logout
// ── @access  Private
const logout = async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0), // expire immediately
  });
  return successResponse(res, 200, 'Logged out successfully');
};

// ── @desc    Get current logged-in user
// ── @route   GET /api/auth/me
// ── @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User fetched successfully', { user });
  } catch (error) {
    next(error);
  }
};

// ── @desc    Google OAuth success handler
// ── @route   GET /api/auth/google/callback
// ── @access  Public
const googleCallback = async (req, res) => {
  try {
    generateToken(res, req.user._id);
    // Redirect to frontend after successful OAuth
    res.redirect(`${process.env.CLIENT_URL}/oauth-success`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

module.exports = { register, login, logout, getMe, googleCallback };