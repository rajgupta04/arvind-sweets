// Cloudinary upload utility
// Uploads image files to Cloudinary and returns secure URL

import API from '../../services/api.js';

const getAuthHeader = () => {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const uploadToBackend = async (file, options = {}) => {
  const endpointBase = API?.defaults?.baseURL || '/api';
  const endpoint = `${endpointBase}/uploads/products/image`;

  const folder = options?.folder ? String(options.folder) : null;
  const maxWidth = options?.maxWidth ? String(options.maxWidth) : null;
  const query = new URLSearchParams();
  if (folder) query.set('folder', folder);
  if (maxWidth) query.set('maxWidth', maxWidth);
  const url = query.toString() ? `${endpoint}?${query.toString()}` : endpoint;

  const formData = new FormData();
  // Backend expects field name "image"
  formData.append('image', file);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend upload failed: ${response.status} ${response.statusText} ${text}`);
  }

  const data = await response.json();
  return data?.optimizedUrl || data?.secureUrl || null;
};

/**
 * Uploads a single image file to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} uploadPreset - Cloudinary upload preset name (optional, for unsigned uploads)
 * @returns {Promise<string>} - Returns the secure_url of the uploaded image
 */
export const uploadToCloudinary = async (file, uploadPreset = null, options = {}) => {
  try {
    // Prefer server-side signed upload so transformations are enforced.
    // Falls back to unsigned preset upload if backend upload isn't available.
    const preferBackend = String(import.meta.env.VITE_USE_BACKEND_UPLOAD ?? 'true').toLowerCase() !== 'false';
    if (preferBackend) {
      try {
        const url = await uploadToBackend(file, options);
        if (url) return url;
      } catch (err) {
        console.warn('Backend upload unavailable, falling back to unsigned preset upload.', err);
      }
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Enforce upload-time optimizations (works best when preset allows these params)
    // Folder-based organization
    const folder = options?.folder
      ? String(options.folder)
      : (import.meta.env.VITE_CLOUDINARY_FOLDER || 'arvind-sweets/products');
    formData.append('folder', folder);

    // Requested options
    formData.append('quality', 'auto');
    formData.append('fetch_format', 'auto');
    formData.append('flags', 'lossy');
    // Width limit transformation (max width 1200)
    const maxWidth = Number(options?.maxWidth) > 0 ? Number(options.maxWidth) : 1200;
    formData.append('transformation', `c_limit,w_${maxWidth}`);

    // Optional eager thumbs (generated at upload-time if allowed by preset)
    formData.append('eager', 'c_fill,g_auto,w_300,h_300|c_fill,g_auto,w_100,h_100');
    formData.append('eager_async', 'true');
    
    // Unsigned uploads REQUIRE an upload preset.
    if (!uploadPreset) {
      throw new Error(
        'Cloudinary unsigned upload requires VITE_CLOUDINARY_UPLOAD_PRESET. Either set it or enable backend upload (recommended).'
      );
    }
    formData.append('upload_preset', uploadPreset);

    // Cloudinary upload URL
    // Replace 'your-cloud-name' with your actual Cloudinary cloud name
    // You can also use environment variable: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    if (!cloudName || cloudName === 'your-cloud-name') {
      throw new Error(
        'Missing VITE_CLOUDINARY_CLOUD_NAME for unsigned uploads. Either set it or enable backend upload (recommended).'
      );
    }
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

