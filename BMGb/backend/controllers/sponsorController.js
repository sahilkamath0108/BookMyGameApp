const { Sponsor, UserAdmin } = require('../models');
const { Op } = require('sequelize');
const { uploadToS3, deleteFromS3, getKeyFromUrl, getPresignedUrl } = require('../utils/s3Service');

// Helper function to check if user is admin (either super or temp)
const isAdmin = async (userId, tournamentId) => {
  const now = new Date();
  
  const admin = await UserAdmin.findOne({
    where: {
      user_id: userId,
      associated_tournament_id: tournamentId,
      start_time: { [Op.lte]: now },
      [Op.or]: [
        { end_time: { [Op.gt]: now } },
        { end_time: null }
      ],
      role: { [Op.in]: ['super_admin', 'temp_admin'] }
    }
  });
  
  return admin;
};

// Get all sponsors for a tournament
const getAllSponsors = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    const sponsors = await Sponsor.findAll({
      where: { tournament_id: tournamentId }
    });
    
    // Generate pre-signed URLs for all sponsor images
    const sponsorsWithPresignedUrls = await Promise.all(sponsors.map(async (sponsor) => {
      const sponsorJson = sponsor.toJSON();
      
      // Generate pre-signed URLs for all image fields
      const imageFields = [
        'logo_url', 'banner_image_url', 'promotional_image1_url', 
        'promotional_image2_url', 'promotional_image3_url', 'promotional_image4_url'
      ];
      
      for (const field of imageFields) {
        if (sponsorJson[field]) {
          const presignedUrlResult = await getPresignedUrl(sponsorJson[field]);
          if (presignedUrlResult.status === 'success') {
            // Store the URL in field_url property (e.g., logo_url_url)
            sponsorJson[field + '_url'] = presignedUrlResult.url;
          }
        }
      }
      
      // Generate pre-signed URLs for images array if it exists
      if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
        const presignedImagesUrls = [];
        for (const imageKey of sponsorJson.images) {
          const presignedUrlResult = await getPresignedUrl(imageKey);
          if (presignedUrlResult.status === 'success') {
            presignedImagesUrls.push(presignedUrlResult.url);
          }
        }
        sponsorJson.image_urls = presignedImagesUrls;
      }
      
      return sponsorJson;
    }));
    
    return res.status(200).json(sponsorsWithPresignedUrls);
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single sponsor by ID
const getSponsorById = async (req, res) => {
  try {
    const { sponsorId } = req.params;
    
    const sponsor = await Sponsor.findByPk(sponsorId);
    
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }
    
    const sponsorJson = sponsor.toJSON();
    
    // Generate pre-signed URLs for all image fields
    const imageFields = [
      'logo_url', 'banner_image_url', 'promotional_image1_url', 
      'promotional_image2_url', 'promotional_image3_url', 'promotional_image4_url'
    ];
    
    for (const field of imageFields) {
      if (sponsorJson[field]) {
        const presignedUrlResult = await getPresignedUrl(sponsorJson[field]);
        if (presignedUrlResult.status === 'success') {
          // Store the URL in field_url property (e.g., logo_url_url)
          sponsorJson[field + '_url'] = presignedUrlResult.url;
          
        }
      }
    }
    
    // Generate pre-signed URLs for images array if it exists
    if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
      const presignedImagesUrls = [];
      for (const imageKey of sponsorJson.images) {
        const presignedUrlResult = await getPresignedUrl(imageKey);
        if (presignedUrlResult.status === 'success') {
          presignedImagesUrls.push(presignedUrlResult.url);
        }
      }
      sponsorJson.image_urls = presignedImagesUrls;
    }
    
    return res.status(200).json(sponsorJson);
  } catch (error) {
    console.error('Error fetching sponsor:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new sponsor (admin only)
const createSponsor = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.user_id;
    
    // Check if user is an admin for this tournament
    const admin = await isAdmin(userId, tournamentId);
    
    if (!admin) {
      return res.status(403).json({ 
        message: 'Access denied. Only tournament admins can create sponsors.' 
      });
    }
    
    // Prepare sponsor data
    const sponsorData = {
      ...req.body,
      tournament_id: tournamentId
    };
    
    // Debug incoming data
    
    
    
    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      // Extract image types from request if available
      const imageTypes = req.body.image_types ? JSON.parse(req.body.image_types) : [];
      
      
      
      // Upload each image to S3
      const uploadPromises = req.files.map((file, index) => {
        
        return uploadToS3(file, `sponsors/${tournamentId}`);
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      
      // Filter successful uploads
      const successfulUploads = uploadResults.filter(result => result.status === 'success');
      
      // If some uploads failed but others succeeded, continue with the successful ones
      const failedUploads = uploadResults.filter(result => result.status !== 'success');
      if (failedUploads.length > 0) {
        console.warn(`${failedUploads.length} image uploads failed`);
      }
      
      // Prepare array to store all image keys for the images field
      const mainImageKeys = new Set(); // Keep track of images used in specific fields
      const additionalImageKeys = []; // For truly additional images
      
      // Map the uploaded files to their respective fields based on image_types
      if (imageTypes.length > 0 && imageTypes.length === req.files.length) {
        // If we have specific image types provided, use them to assign images
        successfulUploads.forEach((result, index) => {
          const imageType = imageTypes[index];
          const imageKey = result.key;
          
          
          
          switch (imageType) {
            case 'logo':
              sponsorData.logo_url = imageKey;
              mainImageKeys.add(imageKey);
              
              break;
            case 'banner':
              sponsorData.banner_image_url = imageKey;
              mainImageKeys.add(imageKey);
              break;
            case 'promo1':
              sponsorData.promotional_image1_url = imageKey;
              mainImageKeys.add(imageKey);
              break;
            case 'promo2':
              sponsorData.promotional_image2_url = imageKey;
              mainImageKeys.add(imageKey);
              break;
            case 'promo3':
              sponsorData.promotional_image3_url = imageKey;
              mainImageKeys.add(imageKey);
              break;
            case 'promo4':
              sponsorData.promotional_image4_url = imageKey;
              mainImageKeys.add(imageKey);
              break;
            case 'additional':
              // Additional images will be included in the images array
              additionalImageKeys.push(imageKey);
              break;
            default:
              // For unknown types, just add to the additional images array
              additionalImageKeys.push(imageKey);
              break;
          }
        });
      } else {
        // Default assignment if no specific types are provided
        successfulUploads.forEach((result, index) => {
          const imageKey = result.key;
          
          // Assign based on index
          if (index === 0) {
            sponsorData.logo_url = imageKey;
            mainImageKeys.add(imageKey);
            
          } else if (index === 1) {
            sponsorData.banner_image_url = imageKey;
            mainImageKeys.add(imageKey);
          } else if (index === 2) {
            sponsorData.promotional_image1_url = imageKey;
            mainImageKeys.add(imageKey);
          } else if (index === 3) {
            sponsorData.promotional_image2_url = imageKey;
            mainImageKeys.add(imageKey);
          } else if (index === 4) {
            sponsorData.promotional_image3_url = imageKey;
            mainImageKeys.add(imageKey);
          } else if (index === 5) {
            sponsorData.promotional_image4_url = imageKey;
            mainImageKeys.add(imageKey);
          } else {
            // Additional images beyond the main ones
            additionalImageKeys.push(imageKey);
          }
        });
      }
      
      // Combine main and additional image keys for the images array
      // Convert Set to Array for mainImageKeys
      sponsorData.images = [...mainImageKeys, ...additionalImageKeys];
      
    }
    
    // Create the sponsor with all data
    const newSponsor = await Sponsor.create(sponsorData);
    
    
    // Convert to JSON to add pre-signed URLs
    const sponsorJson = newSponsor.toJSON();
    
    // Generate pre-signed URLs for all image fields
    const imageFields = [
      'logo_url', 'banner_image_url', 'promotional_image1_url', 
      'promotional_image2_url', 'promotional_image3_url', 'promotional_image4_url'
    ];
    
    for (const field of imageFields) {
      if (sponsorJson[field]) {
        
        const presignedUrlResult = await getPresignedUrl(sponsorJson[field]);
        if (presignedUrlResult.status === 'success') {
          // Store original key in the base field, URL in the _url version
          sponsorJson[field + '_url'] = presignedUrlResult.url;
          
        }
      }
    }
    
    // Generate pre-signed URLs for images array if it exists
    if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
      const presignedImagesUrls = [];
      for (const imageKey of sponsorJson.images) {
        const presignedUrlResult = await getPresignedUrl(imageKey);
        if (presignedUrlResult.status === 'success') {
          presignedImagesUrls.push(presignedUrlResult.url);
        }
      }
      sponsorJson.image_urls = presignedImagesUrls;
    }
    
    return res.status(201).json(sponsorJson);
  } catch (error) {
    console.error('Error creating sponsor:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a sponsor (admin only)
const updateSponsor = async (req, res) => {
  try {
    const { sponsorId, tournamentId } = req.params;
    const userId = req.user.user_id;
    
    // Check if user is an admin for this tournament
    const admin = await isAdmin(userId, tournamentId);
    
    if (!admin) {
      return res.status(403).json({ 
        message: 'Access denied. Only tournament admins can update sponsors.' 
      });
    }
    
    const sponsor = await Sponsor.findByPk(sponsorId);
    
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }
    
    // Make sure the sponsor belongs to the specified tournament
    if (sponsor.tournament_id !== tournamentId) {
      return res.status(400).json({ message: 'Sponsor does not belong to this tournament' });
    }
    
    // Prepare update data
    const updateData = { ...req.body };
    
    // Process image deletions - check for explicit removal flags
    const fieldsToCheck = [
      { field: 'logo_url', flag: 'remove_logo' },
      { field: 'banner_image_url', flag: 'remove_banner' },
      { field: 'promotional_image1_url', flag: 'remove_promo1' },
      { field: 'promotional_image2_url', flag: 'remove_promo2' },
      { field: 'promotional_image3_url', flag: 'remove_promo3' },
      { field: 'promotional_image4_url', flag: 'remove_promo4' }
    ];
    
    // Track deleted keys to update images array
    const deletedKeys = [];
    
    // Process explicit image removals
    for (const { field, flag } of fieldsToCheck) {
      if (req.body[flag] === 'true' && sponsor[field]) {
        // Delete the image from S3
        await deleteFromS3(sponsor[field]);
        
        // Add to list of deleted keys
        deletedKeys.push(sponsor[field]);
        
        // Set field to null in update data
        updateData[field] = null;
        
        // Remove the flag from updateData to prevent it being stored
        delete updateData[flag];
      }
    }
    
    // Process any explicitly removed additional images
    if (req.body.remove_additional_images && Array.isArray(JSON.parse(req.body.remove_additional_images))) {
      const keysToRemove = JSON.parse(req.body.remove_additional_images);
      
      for (const key of keysToRemove) {
        // Delete from S3
        await deleteFromS3(key);
        deletedKeys.push(key);
      }
      
      // Remove the flag from updateData
      delete updateData.remove_additional_images;
    }
    
    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      // Extract image types from request if available
      const imageTypes = req.body.image_types ? JSON.parse(req.body.image_types) : [];
      
      // Upload each image to S3
      const uploadPromises = req.files.map(file => 
        uploadToS3(file, `sponsors/${tournamentId}`)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Filter successful uploads
      const successfulUploads = uploadResults.filter(result => result.status === 'success');
      
      // If some uploads failed but others succeeded, continue with the successful ones
      const failedUploads = uploadResults.filter(result => result.status !== 'success');
      if (failedUploads.length > 0) {
        console.warn(`${failedUploads.length} image uploads failed`);
      }
      
      // Get existing images from the sponsor
      const existingImages = sponsor.images || [];
      const newUploadedKeys = successfulUploads.map(upload => upload.key);
      
      // Map the uploaded files to their respective fields based on image_types
      if (imageTypes.length > 0 && imageTypes.length === req.files.length) {
        // If we have specific image types provided, use them to assign images
        for (let i = 0; i < successfulUploads.length; i++) {
          const upload = successfulUploads[i];
          const imageType = imageTypes[i];
          const imageKey = upload.key;
          
          switch (imageType) {
            case 'logo':
              // If replacing existing logo, delete old one
              if (sponsor.logo_url) {
                await deleteFromS3(sponsor.logo_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.logo_url);
              }
              updateData.logo_url = imageKey;
              break;
            case 'banner':
              // If replacing existing banner, delete old one
              if (sponsor.banner_image_url) {
                await deleteFromS3(sponsor.banner_image_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.banner_image_url);
              }
              updateData.banner_image_url = imageKey;
              break;
            case 'promo1':
              // If replacing existing promo1, delete old one
              if (sponsor.promotional_image1_url) {
                await deleteFromS3(sponsor.promotional_image1_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.promotional_image1_url);
              }
              updateData.promotional_image1_url = imageKey;
              break;
            case 'promo2':
              // If replacing existing promo2, delete old one
              if (sponsor.promotional_image2_url) {
                await deleteFromS3(sponsor.promotional_image2_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.promotional_image2_url);
              }
              updateData.promotional_image2_url = imageKey;
              break;
            case 'promo3':
              // If replacing existing promo3, delete old one
              if (sponsor.promotional_image3_url) {
                await deleteFromS3(sponsor.promotional_image3_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.promotional_image3_url);
              }
              updateData.promotional_image3_url = imageKey;
              break;
            case 'promo4':
              // If replacing existing promo4, delete old one
              if (sponsor.promotional_image4_url) {
                await deleteFromS3(sponsor.promotional_image4_url);
                // Add to list of deleted keys
                deletedKeys.push(sponsor.promotional_image4_url);
              }
              updateData.promotional_image4_url = imageKey;
              break;
            case 'additional':
              // Additional images just get added to the array
              break;
          }
        }
      } else {
        // Handle generic image uploads without specified types
        // We assume they're additional images
      }
      
      // Update the images array with the new keys, removing any deleted keys
      const updatedImages = existingImages
        .filter(key => !deletedKeys.includes(key)) // Remove deleted keys
        .concat(newUploadedKeys); // Add new keys
      
      updateData.images = updatedImages;
    } else {
      // If no new images were uploaded but some were deleted,
      // update the images array to remove deleted keys
      if (deletedKeys.length > 0) {
        const existingImages = sponsor.images || [];
        updateData.images = existingImages.filter(key => !deletedKeys.includes(key));
      }
    }
    
    // Update the sponsor with all data
    await sponsor.update(updateData);
    
    // Fetch the updated sponsor
    const updatedSponsor = await Sponsor.findByPk(sponsorId);
    
    // Convert to JSON to add pre-signed URLs
    const sponsorJson = updatedSponsor.toJSON();
    
    // Generate pre-signed URLs for all image fields
    const imageFields = [
      'logo_url', 'banner_image_url', 'promotional_image1_url', 
      'promotional_image2_url', 'promotional_image3_url', 'promotional_image4_url'
    ];
    
    for (const field of imageFields) {
      if (sponsorJson[field]) {
        const presignedUrlResult = await getPresignedUrl(sponsorJson[field]);
        if (presignedUrlResult.status === 'success') {
          // Store URL in the _url version of the field for frontend consumption
          sponsorJson[field + '_url'] = presignedUrlResult.url;
        }
      }
    }
    
    // Generate pre-signed URLs for images array if it exists
    if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
      const presignedImagesUrls = [];
      for (const imageKey of sponsorJson.images) {
        const presignedUrlResult = await getPresignedUrl(imageKey);
        if (presignedUrlResult.status === 'success') {
          presignedImagesUrls.push(presignedUrlResult.url);
        }
      }
      sponsorJson.image_urls = presignedImagesUrls;
    }
    
    return res.status(200).json(sponsorJson);
  } catch (error) {
    console.error('Error updating sponsor:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a sponsor (admin only)
const deleteSponsor = async (req, res) => {
  try {
    const { sponsorId, tournamentId } = req.params;
    const userId = req.user.user_id;
    
    // Check if user is an admin for this tournament
    const admin = await isAdmin(userId, tournamentId);
    
    if (!admin) {
      return res.status(403).json({ 
        message: 'Access denied. Only tournament admins can delete sponsors.' 
      });
    }
    
    const sponsor = await Sponsor.findByPk(sponsorId);
    
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }
    
    // Make sure the sponsor belongs to the specified tournament
    if (sponsor.tournament_id !== tournamentId) {
      return res.status(400).json({ message: 'Sponsor does not belong to this tournament' });
    }
    
    // Delete all images from S3
    const imageFields = [
      'logo_url', 'banner_image_url', 'promotional_image1_url', 
      'promotional_image2_url', 'promotional_image3_url', 'promotional_image4_url'
    ];
    
    // Delete main images if they exist
    for (const field of imageFields) {
      if (sponsor[field]) {
        await deleteFromS3(sponsor[field]);
      }
    }
    
    // Delete additional images in the images array
    if (sponsor.images && Array.isArray(sponsor.images)) {
      // Get a list of keys already deleted to avoid duplicates
      const alreadyDeletedKeys = imageFields
        .filter(field => sponsor[field])
        .map(field => sponsor[field]);
      
      for (const imageKey of sponsor.images) {
        // Only delete if it's not one of the already deleted main images
        if (!alreadyDeletedKeys.includes(imageKey)) {
          await deleteFromS3(imageKey);
        }
      }
    }
    
    await sponsor.destroy();
    
    return res.status(200).json({ message: 'Sponsor deleted successfully' });
  } catch (error) {
    console.error('Error deleting sponsor:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all sponsor images for a tournament, sorted by sponsorship amount (highest first)
 * 
 * @route GET /api/tournament/:tournamentId/sponsor-images
 * @param {string} tournamentId - The ID of the tournament
 * @returns {Object} Object containing arrays of images categorized by type (logo, banner, promotional, additional)
 * @description
 * This endpoint returns all images from all sponsors of a tournament, sorted by sponsorship amount.
 * The response includes separate arrays for different image types:
 * - logo_images: Main sponsor logos
 * - banner_images: Banner images
 * - promotional_images: Promotional images (promo1, promo2, etc.)
 * - additional_images: Any other images not categorized above
 * 
 * Each image object includes:
 * - url: Pre-signed URL ready to use in the frontend
 * - sponsor_id: The ID of the sponsor
 * - sponsor_name: The name of the sponsor
 * - sponsorship_level: The level of sponsorship (platinum, gold, silver, bronze)
 * - type: The type of image (logo, banner, promotional, additional)
 */
const getAllSponsorImages = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    // Fetch all sponsors for the tournament, ordered by sponsorship_amount in descending order
    const sponsors = await Sponsor.findAll({
      where: { 
        tournament_id: tournamentId,
        is_active: true
      },
      order: [
        ['sponsorship_amount', 'DESC'],
        ['sponsorship_level', 'ASC'],
        ['created_at', 'ASC']
      ]
    });
    
    if (!sponsors || sponsors.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          sponsors: [],
          logo_images: [],
          banner_images: [],
          promotional_images: [],
          additional_images: []
        }
      });
    }
    
    // Prepare arrays for different image types
    const logoImages = [];
    const bannerImages = [];
    const promotionalImages = [];
    const additionalImages = [];
    const sponsorDetails = [];
    
    // Process each sponsor
    for (const sponsor of sponsors) {
      const sponsorJson = sponsor.toJSON();
      const sponsorInfo = {
        sponsor_id: sponsorJson.sponsor_id,
        name: sponsorJson.name,
        sponsorship_level: sponsorJson.sponsorship_level,
        website: sponsorJson.website,
        description: sponsorJson.description
      };
      
      // Process logo
      if (sponsorJson.logo_url) {
        const presignedLogoUrl = await getPresignedUrl(sponsorJson.logo_url);
        if (presignedLogoUrl.status === 'success') {
          logoImages.push({
            url: presignedLogoUrl.url,
            sponsor_id: sponsorJson.sponsor_id,
            sponsor_name: sponsorJson.name,
            sponsorship_level: sponsorJson.sponsorship_level,
            website: sponsorJson.website,
            type: 'logo'
          });
        }
      }
      
      // Process banner
      if (sponsorJson.banner_image_url) {
        const presignedBannerUrl = await getPresignedUrl(sponsorJson.banner_image_url);
        if (presignedBannerUrl.status === 'success') {
          bannerImages.push({
            url: presignedBannerUrl.url,
            sponsor_id: sponsorJson.sponsor_id,
            sponsor_name: sponsorJson.name,
            sponsorship_level: sponsorJson.sponsorship_level,
            website: sponsorJson.website,
            type: 'banner'
          });
        }
      }
      
      // Process promotional images
      const promoFields = [
        'promotional_image1_url', 
        'promotional_image2_url', 
        'promotional_image3_url', 
        'promotional_image4_url'
      ];
      
      for (const field of promoFields) {
        if (sponsorJson[field]) {
          const presignedPromoUrl = await getPresignedUrl(sponsorJson[field]);
          if (presignedPromoUrl.status === 'success') {
            promotionalImages.push({
              url: presignedPromoUrl.url,
              sponsor_id: sponsorJson.sponsor_id,
              sponsor_name: sponsorJson.name,
              sponsorship_level: sponsorJson.sponsorship_level,
              website: sponsorJson.website,
              type: 'promotional',
              field: field.replace('_url', '')
            });
          }
        }
      }
      
      // Process additional images
      if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
        // Filter out images that are already used as logo, banner, or promotional images
        const usedKeys = [
          sponsorJson.logo_url,
          sponsorJson.banner_image_url,
          sponsorJson.promotional_image1_url,
          sponsorJson.promotional_image2_url,
          sponsorJson.promotional_image3_url,
          sponsorJson.promotional_image4_url
        ].filter(Boolean); // Remove null/undefined values
        
        const additionalKeys = sponsorJson.images.filter(key => !usedKeys.includes(key));
        
        for (const imageKey of additionalKeys) {
          const presignedUrl = await getPresignedUrl(imageKey);
          if (presignedUrl.status === 'success') {
            additionalImages.push({
              url: presignedUrl.url,
              sponsor_id: sponsorJson.sponsor_id,
              sponsor_name: sponsorJson.name,
              sponsorship_level: sponsorJson.sponsorship_level,
              website: sponsorJson.website,
              type: 'additional'
            });
          }
        }
      }
      
      // Add sponsor details
      sponsorDetails.push(sponsorInfo);
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        sponsors: sponsorDetails,
        logo_images: logoImages,
        banner_images: bannerImages,
        promotional_images: promotionalImages,
        additional_images: additionalImages
      }
    });
  } catch (error) {
    console.error('Error fetching sponsor images:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Test endpoint to log sponsor images for debugging (temporary)
 */
const testSponsorImages = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    
    // Fetch all sponsors for the tournament
    const sponsors = await Sponsor.findAll({
      where: { tournament_id: tournamentId },
      order: [['sponsorship_amount', 'DESC']]
    });
    
    
    
    // Log image counts for each sponsor
    for (const sponsor of sponsors) {
      
      
      
      
      
      
      
      
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Check server logs for image details',
      sponsors_count: sponsors.length
    });
  } catch (error) {
    console.error('Error in test sponsor images:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get all sponsor images globally (from all tournaments), sorted by sponsorship amount (highest first)
 * 
 * @route GET /api/sponsors/global/sponsor-images
 * @returns {Object} Object containing arrays of images categorized by type (logo, banner, promotional, additional)
 * @description
 * This endpoint returns all images from all sponsors across all tournaments, sorted by sponsorship amount.
 * The response includes separate arrays for different image types:
 * - logo_images: Main sponsor logos
 * - banner_images: Banner images
 * - promotional_images: Promotional images (promo1, promo2, etc.)
 * - additional_images: Any other images not categorized above
 * 
 * Each image object includes:
 * - url: Pre-signed URL ready to use in the frontend
 * - sponsor_id: The ID of the sponsor
 * - sponsor_name: The name of the sponsor
 * - sponsorship_level: The level of sponsorship (platinum, gold, silver, bronze)
 * - tournament_id: The tournament this sponsor belongs to
 * - tournament_name: The name of the tournament
 * - type: The type of image (logo, banner, promotional, additional)
 */
const getAllSponsorImagesGlobal = async (req, res) => {
  try {
    // Fetch all sponsors from all tournaments, ordered by sponsorship_amount in descending order
    const sponsors = await Sponsor.findAll({
      where: { 
        is_active: true
      },
      order: [
        ['sponsorship_amount', 'DESC'],
        ['sponsorship_level', 'ASC'],
        ['created_at', 'ASC']
      ],
      // Include tournament information if we have a Tournament model
      // For now, we'll fetch tournament details separately if needed
    });
    
    if (!sponsors || sponsors.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          sponsors: [],
          logo_images: [],
          banner_images: [],
          promotional_images: [],
          additional_images: []
        }
      });
    }
    
    // Prepare arrays for different image types
    const logoImages = [];
    const bannerImages = [];
    const promotionalImages = [];
    const additionalImages = [];
    const sponsorDetails = [];
    
    // Process each sponsor
    for (const sponsor of sponsors) {
      const sponsorJson = sponsor.toJSON();
      const sponsorInfo = {
        sponsor_id: sponsorJson.sponsor_id,
        name: sponsorJson.name,
        sponsorship_level: sponsorJson.sponsorship_level,
        tournament_id: sponsorJson.tournament_id,
        website: sponsorJson.website,
        description: sponsorJson.description,
        sponsorship_amount: sponsorJson.sponsorship_amount
      };
      
      // Process logo
      if (sponsorJson.logo_url) {
        const presignedLogoUrl = await getPresignedUrl(sponsorJson.logo_url);
        if (presignedLogoUrl.status === 'success') {
          logoImages.push({
            url: presignedLogoUrl.url,
            sponsor_id: sponsorJson.sponsor_id,
            sponsor_name: sponsorJson.name,
            sponsorship_level: sponsorJson.sponsorship_level,
            tournament_id: sponsorJson.tournament_id,
            sponsorship_amount: sponsorJson.sponsorship_amount,
            website: sponsorJson.website,
            type: 'logo'
          });
        }
      }
      
      // Process banner
      if (sponsorJson.banner_image_url) {
        const presignedBannerUrl = await getPresignedUrl(sponsorJson.banner_image_url);
        if (presignedBannerUrl.status === 'success') {
          bannerImages.push({
            url: presignedBannerUrl.url,
            sponsor_id: sponsorJson.sponsor_id,
            sponsor_name: sponsorJson.name,
            sponsorship_level: sponsorJson.sponsorship_level,
            tournament_id: sponsorJson.tournament_id,
            sponsorship_amount: sponsorJson.sponsorship_amount,
            website: sponsorJson.website,
            type: 'banner'
          });
        }
      }
      
      // Process promotional images
      const promoFields = [
        'promotional_image1_url', 
        'promotional_image2_url', 
        'promotional_image3_url', 
        'promotional_image4_url'
      ];
      
      for (const field of promoFields) {
        if (sponsorJson[field]) {
          const presignedPromoUrl = await getPresignedUrl(sponsorJson[field]);
          if (presignedPromoUrl.status === 'success') {
            promotionalImages.push({
              url: presignedPromoUrl.url,
              sponsor_id: sponsorJson.sponsor_id,
              sponsor_name: sponsorJson.name,
              sponsorship_level: sponsorJson.sponsorship_level,
              tournament_id: sponsorJson.tournament_id,
              sponsorship_amount: sponsorJson.sponsorship_amount,
              website: sponsorJson.website,
              type: 'promotional',
              field: field.replace('_url', '')
            });
          }
        }
      }
      
      // Process additional images
      if (sponsorJson.images && Array.isArray(sponsorJson.images)) {
        // Filter out images that are already used as logo, banner, or promotional images
        const usedKeys = [
          sponsorJson.logo_url,
          sponsorJson.banner_image_url,
          sponsorJson.promotional_image1_url,
          sponsorJson.promotional_image2_url,
          sponsorJson.promotional_image3_url,
          sponsorJson.promotional_image4_url
        ].filter(Boolean); // Remove null/undefined values
        
        const additionalKeys = sponsorJson.images.filter(key => !usedKeys.includes(key));
        
        for (const imageKey of additionalKeys) {
          const presignedUrl = await getPresignedUrl(imageKey);
          if (presignedUrl.status === 'success') {
            additionalImages.push({
              url: presignedUrl.url,
              sponsor_id: sponsorJson.sponsor_id,
              sponsor_name: sponsorJson.name,
              sponsorship_level: sponsorJson.sponsorship_level,
              tournament_id: sponsorJson.tournament_id,
              sponsorship_amount: sponsorJson.sponsorship_amount,
              website: sponsorJson.website,
              type: 'additional'
            });
          }
        }
      }
      
      // Add sponsor details
      sponsorDetails.push(sponsorInfo);
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        sponsors: sponsorDetails,
        logo_images: logoImages,
        banner_images: bannerImages,
        promotional_images: promotionalImages,
        additional_images: additionalImages
      }
    });
  } catch (error) {
    console.error('Error fetching global sponsor images:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllSponsors,
  getSponsorById,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getAllSponsorImages,
  testSponsorImages,
  getAllSponsorImagesGlobal
}; 