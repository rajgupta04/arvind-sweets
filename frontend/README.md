# Frontend

Frontend application for Arvind Sweets.

## Google Maps (Live Tracking)

The live tracking map uses the **Google Maps JavaScript API** (client-side only, React + Vite).

### Setup

- Create a Google Cloud project
- Enable **Maps JavaScript API**
- Create an **API key** and restrict it:
	- Application restriction: **HTTP referrers (web sites)**
	- Add dev + prod domains (examples):
		- `http://localhost:5173/*`
		- `https://your-domain.com/*`

Add these env vars in [frontend/.env](frontend/.env) (or `.env.development` / `.env.production`):

- `VITE_GOOGLE_MAPS_API_KEY=...`
- `VITE_SHOP_LAT=...`
- `VITE_SHOP_LNG=...`

Then restart the dev server.

### What the map shows

- Shop marker
- Delivery boy marker (updates via socket)
- Customer marker (shipping address)
- A polyline path: Shop → Delivery Boy → Customer

If Google Maps fails to load (network / key restriction / billing), the UI shows an error and a Retry button.

## Cloudinary image optimization

This frontend **does not render raw Cloudinary URLs directly**. It transforms delivery URLs to ensure fast formats and reasonable sizes.

### What gets applied at delivery-time

- `q_auto` (automatic quality)
- `f_auto` (automatic format: WebP/AVIF when supported)
- `w_auto` (responsive width)
- `dpr_auto` (device DPR)

### Admin uploads (upload-time)

Admin product create/edit uploads try **backend signed upload** first (recommended), then fall back to unsigned preset uploads.

Env vars:

- `VITE_BACKEND_URL=http://localhost:5000`
- Optional: `VITE_USE_BACKEND_UPLOAD=false` (force unsigned uploads only)
- Optional: `VITE_CLOUDINARY_FOLDER=arvind-sweets/products` (folder organization)

### How to validate

1. Open DevTools → Network → click an image request
2. Confirm `Content-Type` is `image/avif` or `image/webp`
3. Confirm the request URL contains a transform segment like:
	- `/image/upload/q_auto,f_auto,w_auto,dpr_auto,.../`
4. Compare transferred size (KB) against the original

Optional console helper (best-effort, uses `HEAD` + `content-length` if available):

```js
import { logCloudinarySizeDiff } from './src/lib/cloudinary.js';
await logCloudinarySizeDiff('https://res.cloudinary.com/<cloud>/image/upload/v123/<public_id>.jpg');
```

