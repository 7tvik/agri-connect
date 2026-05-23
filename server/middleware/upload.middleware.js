// server/middleware/upload.middleware.js
const multer = require('multer');

// WHY memoryStorage? We don't want to save files to disk on our server.
// We want to receive them in memory and immediately forward to Cloudinary.
// diskStorage would create files on the server — wasteful and messy.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow image file types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);  // accept file
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed'), false); // reject
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 5,                   // max 5 files per upload
  },
});

module.exports = upload;