// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { errorMiddleware } = require('./middleware/error.middleware');

const app = express();

// ── Security middleware ──────────────────────────────────────────────
app.use(helmet());

// ── Rate limiting — max 100 requests per 15 min per IP ──────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ── CORS — only allow our frontend ──────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true, // allow cookies to be sent
}));

// ── Body parsers ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Request logging (only in development) ───────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health check route ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AgriConnect API is running 🌾' });
});

// ── Routes (we'll add these as we build each feature) ───────────────
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/listings', require('./routes/listing.routes'));
// app.use('/api/orders', require('./routes/order.routes'));

// ── Global error handler (must be last) ─────────────────────────────
app.use(errorMiddleware);

module.exports = app;