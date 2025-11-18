// Cloudinary upload utility
// Uploads image files to Cloudinary and returns secure URL

/**
 * Uploads a single image file to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} uploadPreset - Cloudinary upload preset name (optional, for unsigned uploads)
 * @returns {Promise<string>} - Returns the secure_url of the uploaded image
 */
export const uploadToCloudinary = async (file, uploadPreset = null) => {
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // If upload preset is provided, use it for unsigned upload
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset);
    }

    // Cloudinary upload URL
    // Replace 'your-cloud-name' with your actual Cloudinary cloud name
    // You can also use environment variable: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    // Upload to Cloudinary
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return secure URL
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error('No secure_url in response');
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Uploads multiple image files to Cloudinary
 * @param {File[]} files - Array of image files to upload
 * @param {string} uploadPreset - Cloudinary upload preset name (optional)
 * @returns {Promise<string[]>} - Returns array of secure_urls
 */
export const uploadMultipleToCloudinary = async (files, uploadPreset = null) => {
  try {
    const uploadPromises = Array.from(files).map(file => 
      uploadToCloudinary(file, uploadPreset)
    );
    
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw error;
  }
};

