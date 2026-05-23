// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  googleCallback,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// ── Validation rules ─────────────────────────────────────────────────
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['farmer', 'buyer']).withMessage('Role must be farmer or buyer'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ── Validation error handler helper ─────────────────────────────────
const { validationResult } = require('express-validator');
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // return first error only
      errors: errors.array(),
    });
  }
  next();
};

// ── Routes ───────────────────────────────────────────────────────────
router.post('/register', registerValidation, validate, register);
router.post('/login',    loginValidation,    validate, login);
router.post('/logout',   protect,                      logout);
router.get('/me',        protect,                      getMe);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

module.exports = router;