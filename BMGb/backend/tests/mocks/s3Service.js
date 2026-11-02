module.exports = {
  uploadToS3: jest.fn(async (file, folder) => ({
    status: 'success',
    key: `${folder}/test-file`,
    url: `https://s3.test/${folder}/test-file`
  })),
  deleteFromS3: jest.fn(async () => ({ status: 'success' })),
  getPresignedUrl: jest.fn(async (key) => ({
    status: 'success',
    url: `https://s3.test/${key}?signed=1`
  })),
  getKeyFromUrl: jest.fn((url) => url)
};
