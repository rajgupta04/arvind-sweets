const isCloudinaryUrl = (url = '') => {
  if (typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/');
};

const normalizeTransform = (transform) => String(transform).replace(/^\/+|\/+$/g, '');

/**
 * Inserts Cloudinary transformations into an existing Cloudinary delivery URL.
 * - No-ops for non-Cloudinary URLs.
 * - Preserves existing version/publicId segments.
 */
export const withCloudinaryTransform = (url, transform) => {
  if (!isCloudinaryUrl(url)) return url;

  const normalized = normalizeTransform(transform);
  if (!normalized) return url;

  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);

  // If URL already has a transformation segment, we prepend ours.
  // This ensures our optimization directives are applied consistently.
  return `${prefix}${normalized}/${rest}`;
};

/**
 * Default optimized URL for product images.
 * Uses Cloudinary automatic quality/format + responsive width + device DPR.
 */
export const getOptimizedImageUrl = (url) => {
  // Required by spec: q_auto, f_auto, w_auto, dpr_auto
  // Keeping lossy here improves bytes; safe for photos, acceptable for many product images.
  return withCloudinaryTransform(url, 'q_auto,f_auto,w_auto,dpr_auto,fl_lossy');
};

/**
 * Thumbnail (square) for product cards.
 */
export const getProductCardThumbUrl = (url) => {
  return withCloudinaryTransform(url, 'c_fill,g_auto,w_300,h_300,q_auto,f_auto,dpr_auto,fl_lossy');
};

/**
 * Tiny thumbnail (square) for admin table previews.
 */
export const getAdminThumbUrl = (url) => {
  return withCloudinaryTransform(url, 'c_fill,g_auto,w_100,h_100,q_auto,f_auto,dpr_auto,fl_lossy');
};

const tryHeadContentLength = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const raw = response.headers.get('content-length');
    const parsed = raw ? Number.parseInt(raw, 10) : null;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Best-effort validation helper:
 * Logs content-length for the original Cloudinary URL and the optimized URL.
 * NOTE: content-length header may be absent depending on browser/CDN behavior.
 */
export const logCloudinarySizeDiff = async (originalUrl) => {
  if (typeof window === 'undefined') return;
  if (!isCloudinaryUrl(originalUrl)) {
    console.log('[cloudinary] not a cloudinary url, skipping size diff');
    return;
  }

  const optimizedUrl = getOptimizedImageUrl(originalUrl);

  const [originalBytes, optimizedBytes] = await Promise.all([
    tryHeadContentLength(originalUrl),
    tryHeadContentLength(optimizedUrl),
  ]);

  console.log('[cloudinary] original url:', originalUrl);
  console.log('[cloudinary] optimized url:', optimizedUrl);
  console.log('[cloudinary] original bytes:', originalBytes);
  console.log('[cloudinary] optimized bytes:', optimizedBytes);
};
