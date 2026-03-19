const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Upload file to S3
const uploadToS3 = async (file, folder = '') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate a unique file name
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}${folder ? '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    // Set parameters for S3 upload
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    // Upload file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Generate a pre-signed URL for the uploaded object
    const presignedUrl = await getPresignedUrl(fileName);

    // Return both the S3 key and pre-signed URL
    return {
      status: 'success',
      url: presignedUrl.url,
      key: fileName
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return {
      status: 'error',
      message: `Error uploading to S3: ${error.message}`
    };
  }
};

// Delete file from S3
const deleteFromS3 = async (fileKey) => {
  try {
    if (!fileKey) {
      throw new Error('No file key provided');
    }

    // Set parameters for S3 delete
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    };

    // Delete file from S3
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);

    return {
      status: 'success',
      message: 'File deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return {
      status: 'error',
      message: `Error deleting from S3: ${error.message}`
    };
  }
};

// Generate a pre-signed URL for an S3 object
const getPresignedUrl = async (fileKey) => {
  try {
    if (!fileKey) {
      throw new Error('No file key provided');
    }

    // Create a GetObject command
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    // Generate a pre-signed URL with 7 days (604800 seconds) expiration
    // This ensures consistency across the application
    const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
    
    return {
      status: 'success',
      url: url
    };
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return {
      status: 'error',
      message: `Error generating pre-signed URL: ${error.message}`
    };
  }
};

// Extract file key from S3 URL
const getKeyFromUrl = (url) => {
  if (!url) return null;
  const baseUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  return url.replace(baseUrl, '');
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getKeyFromUrl,
  getPresignedUrl
}; 