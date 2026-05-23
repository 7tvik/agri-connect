// server/services/cloudinary.service.js
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary with our credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Upload a file buffer to Cloudinary ───────────────────────────────
// WHY buffer stream? Multer stores file in memory as a Buffer (raw bytes).
// Cloudinary needs a readable stream. streamifier converts Buffer → Stream.
const uploadToCloudinary = (fileBuffer, folder = 'agriconnect') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,                    // organizes files in Cloudinary dashboard
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'limit' }, // resize large images
          { quality: 'auto' },                         // auto compress
          { fetch_format: 'auto' },                    // serve WebP if browser supports it
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);           // result.secure_url is the image URL we store
      }
    );
    // Convert buffer to stream and pipe into Cloudinary uploader
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// ── Delete an image from Cloudinary ──────────────────────────────────
// publicId looks like: "agriconnect/abc123"
const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };