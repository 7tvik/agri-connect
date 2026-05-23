// server/controllers/listing.controller.js
const Listing = require('../models/Listing.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────────────────────────────────
// @desc    Create a new listing
// @route   POST /api/listings
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────
const createListing = async (req, res, next) => {
  try {
    const {
      title, description, category,
      pricePerUnit, unit, quantityAvailable,
      estimatedAvailableDate, tags, location,
    } = req.body;

    // ── Guard: check required fields exist before touching them ───────
    if (!title || !description || !category || !pricePerUnit || !unit || !quantityAvailable || !estimatedAvailableDate) {
      return errorResponse(res, 400, 'Please provide all required fields');
    }

    // ── Safe number conversion with validation ────────────────────────
    // WHY parseFloat + isNaN check? Number('') returns 0 silently.
    // parseFloat + isNaN gives us a proper invalid-value check.
    const parsedPrice = parseFloat(pricePerUnit);
    const parsedQty   = parseFloat(quantityAvailable);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return errorResponse(res, 400, 'Price must be a valid positive number');
    }
    if (isNaN(parsedQty) || parsedQty < 0) {
      return errorResponse(res, 400, 'Quantity must be a valid positive number');
    }

    // ── Safe category trim ────────────────────────────────────────────
    const trimmedCategory = category.trim();

    // ── Handle image uploads ──────────────────────────────────────────
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'agriconnect/listings')
      );
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    // ── Safe JSON parse for optional fields ───────────────────────────
    let parsedTags = [];
    let parsedLocation = {};
    try {
      parsedTags     = tags     ? JSON.parse(tags)     : [];
      parsedLocation = location ? JSON.parse(location) : {};
    } catch (e) {
      // if tags/location aren't valid JSON, just use defaults
      parsedTags     = [];
      parsedLocation = {};
    }

    const listing = await Listing.create({
      farmer:                 req.user._id,
      title:                  title.trim(),
      description:            description.trim(),
      category:               trimmedCategory,
      pricePerUnit:           parsedPrice,
      unit,
      quantityAvailable:      parsedQty,
      estimatedAvailableDate: new Date(estimatedAvailableDate),
      images:                 imageUrls,
      tags:                   parsedTags,
      location:               parsedLocation,
    });

    return successResponse(res, 201, 'Listing created successfully', { listing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get all listings (with filters, search, pagination)
// @route   GET /api/listings
// @access  Public
// ─────────────────────────────────────────────────────────────────────
const getListings = async (req, res, next) => {
  try {
    // ── Read query params from URL ────────────────────────────────────
    // Example: GET /api/listings?category=Vegetables&page=2&limit=10
    const {
      category,
      search,
      minPrice,
      maxPrice,
      status = 'available',
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // ── Build the MongoDB filter object dynamically ───────────────────
    // WHY dynamic? We don't want to always filter by all fields.
    // We only add a filter if the query param exists.
    const filter = { status };

    if (category) filter.category = category;

    if (search) {
      // $text uses our text index for full-text search across title, description, tags
      filter.$text = { $search: search };
    }

    if (minPrice || maxPrice) {
      filter.pricePerUnit = {};
      if (minPrice) filter.pricePerUnit.$gte = Number(minPrice); // >=
      if (maxPrice) filter.pricePerUnit.$lte = Number(maxPrice); // <=
    }

    // ── Pagination math ───────────────────────────────────────────────
    // WHY paginate? If we have 10,000 listings, sending all at once
    // would be slow and crash the browser. We send 12 at a time.
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit))); // cap at 50
    const skip     = (pageNum - 1) * limitNum; // skip = how many docs to skip

    // ── Sort object ───────────────────────────────────────────────────
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // ── Execute query with populate ───────────────────────────────────
    // .populate() replaces farmer ObjectId with the actual User document fields
    // WHY? Frontend needs farmer name and avatar, not just their ID
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('farmer', 'name avatar location rating') // only fetch these fields
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Listing.countDocuments(filter), // total count for pagination UI
    ]);

    return successResponse(res, 200, 'Listings fetched', {
      listings,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore:    pageNum * limitNum < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────
const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('farmer', 'name avatar location rating bio phone');

    if (!listing) {
      return errorResponse(res, 404, 'Listing not found');
    }

    // Increment view count (fire and forget — we don't await this)
    // WHY not await? View count is not critical — we don't want to
    // slow down the response waiting for a non-essential DB write
    Listing.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    return successResponse(res, 200, 'Listing fetched', { listing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Get listings by the logged-in farmer
// @route   GET /api/listings/my-listings
// @access  Private (Farmer only)
// ─────────────────────────────────────────────────────────────────────
const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ farmer: req.user._id })
      .sort({ createdAt: -1 }); // newest first

    return successResponse(res, 200, 'Your listings fetched', {
      listings,
      count: listings.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Update a listing
// @route   PUT /api/listings/:id
// @access  Private (Farmer — owner only)
// ─────────────────────────────────────────────────────────────────────
const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return errorResponse(res, 404, 'Listing not found');
    }

    // ── Ownership check ───────────────────────────────────────────────
    // WHY toString()? listing.farmer is a MongoDB ObjectId object.
    // req.user._id is also an ObjectId. Direct === comparison fails
    // because they are different object references even if values match.
    // .toString() converts both to strings for safe comparison.
    if (listing.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update this listing');
    }

    // Handle new image uploads if any
    let newImageUrls = listing.images; // keep existing by default
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((f) =>
        uploadToCloudinary(f.buffer, 'agriconnect/listings')
      );
      const results = await Promise.all(uploadPromises);
      newImageUrls = results.map((r) => r.secure_url);
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { ...req.body, images: newImageUrls },
      {
        new: true,       // return the UPDATED document, not the original
        runValidators: true, // run schema validators on update too
      }
    );

    return successResponse(res, 200, 'Listing updated', { listing: updatedListing });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// @desc    Delete a listing
// @route   DELETE /api/listings/:id
// @access  Private (Farmer — owner only)
// ─────────────────────────────────────────────────────────────────────
const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return errorResponse(res, 404, 'Listing not found');
    }

    if (listing.farmer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this listing');
    }

    // Delete images from Cloudinary before removing the document
    // WHY? If we delete the DB record first and Cloudinary fails,
    // we have orphaned images taking up storage with no reference
    if (listing.images.length > 0) {
      const deletePromises = listing.images.map((url) => {
        // Extract public_id from Cloudinary URL
        // URL looks like: https://res.cloudinary.com/cloud/image/upload/v123/agriconnect/listings/abc123.jpg
        // We need: agriconnect/listings/abc123
        const parts = url.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${filename}`;
        return deleteFromCloudinary(publicId);
      });
      await Promise.all(deletePromises);
    }

    await listing.deleteOne();

    return successResponse(res, 200, 'Listing deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  updateListing,
  deleteListing,
};