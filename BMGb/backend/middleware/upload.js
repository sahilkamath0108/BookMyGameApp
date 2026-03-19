const multer = require('multer');

// Configure memory storage for multer (no disk storage)
const storage = multer.memoryStorage();

// Define file filter to only allow image files
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Max 10 files per upload
  }
});

// Helper for handling single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Helper for handling multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

// Error handler middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files uploaded'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `Multer error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleMulterError
}; 