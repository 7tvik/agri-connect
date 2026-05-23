// server/routes/listing.routes.js
const express = require('express');
const router = express.Router();
const {
  createListing, getListings, getListingById,
  getMyListings, updateListing, deleteListing,
} = require('../controllers/listing.controller');
const { protect }         = require('../middleware/auth.middleware');
const { authorizeRoles }  = require('../middleware/role.middleware');
const upload              = require('../middleware/upload.middleware');

// ── Public routes (no auth needed) ───────────────────────────────────
router.get('/',    getListings);      // browse all listings
router.get('/:id', getListingById);   // view single listing

// ── Private routes (auth required) ───────────────────────────────────
// .array('images', 5) means: expect a field named 'images', max 5 files
router.post(
  '/',
  protect,
  authorizeRoles('farmer'),
  upload.array('images', 5),  // multer processes files BEFORE controller runs
  createListing
);

router.get(
  '/farmer/my-listings',
  protect,
  authorizeRoles('farmer'),
  getMyListings
);

router.put(
  '/:id',
  protect,
  authorizeRoles('farmer'),
  upload.array('images', 5),
  updateListing
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('farmer'),
  deleteListing
);

module.exports = router;