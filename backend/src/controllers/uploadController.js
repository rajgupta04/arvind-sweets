import fetch from 'node-fetch';
import { getCloudinary } from '../config/cloudinary.js';

const parseIntOr = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const headContentLength = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const length = response.headers.get('content-length');
    const parsed = length ? Number.parseInt(length, 10) : null;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const uploadProductImage = async (req, res) => {
  const cloudinary = getCloudinary();

  if (!req.file) {
    return res.status(400).json({ message: 'Missing file. Send multipart/form-data with field name "image".' });
  }

  const originalBytes = req.file.size;

  const maxWidth = parseIntOr(req.query.maxWidth, 1200);
  const folder = String(req.query.folder || 'arvind-sweets/products');

  const uploadOptions = {
    folder,
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
    // Use both lossy + strip_profile to reduce payload and remove embedded metadata/profiles.
    flags: 'lossy,strip_profile',
    transformation: [{
      width: maxWidth,
      crop: 'limit',
    }],
    eager: [
      {
        crop: 'fill',
        gravity: 'auto',
        width: 300,
        height: 300,
        quality: 'auto',
        fetch_format: 'auto',
        dpr: 'auto',
        flags: 'lossy,strip_profile',
      },
      {
        crop: 'fill',
        gravity: 'auto',
        width: 100,
        height: 100,
        quality: 'auto',
        fetch_format: 'auto',
        dpr: 'auto',
        flags: 'lossy,strip_profile',
      },
    ],
    eager_async: true,
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploaded) => {
        if (error) return reject(error);
        resolve(uploaded);
      });
      stream.end(req.file.buffer);
    });

    const publicId = result.public_id;

    const optimizedUrl = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { crop: 'limit', width: maxWidth },
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { dpr: 'auto' },
        { flags: 'lossy,strip_profile' },
      ],
    });

    const thumb300Url = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { crop: 'fill', width: 300, height: 300, gravity: 'auto' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { dpr: 'auto' },
        { flags: 'lossy,strip_profile' },
      ],
    });

    const thumb100Url = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { crop: 'fill', width: 100, height: 100, gravity: 'auto' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { dpr: 'auto' },
        { flags: 'lossy,strip_profile' },
      ],
    });

    let deliveredBytes = null;
    if (String(process.env.LOG_CLOUDINARY_SIZE_DIFF || '').toLowerCase() === 'true') {
      deliveredBytes = await headContentLength(optimizedUrl);
      console.log('[cloudinary] upload size bytes:', originalBytes);
      console.log('[cloudinary] delivered optimized bytes:', deliveredBytes);
    }

    return res.status(201).json({
      publicId,
      // Keep the raw secure_url for compatibility, but clients should prefer optimizedUrl.
      secureUrl: result.secure_url,
      optimizedUrl,
      thumbs: {
        card300: thumb300Url,
        admin100: thumb100Url,
      },
      bytes: {
        original: originalBytes,
        uploadedAsset: result.bytes ?? null,
        deliveredOptimized: deliveredBytes,
      },
    });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    return res.status(500).json({ message: 'Cloudinary upload failed', error: error?.message });
  }
};
