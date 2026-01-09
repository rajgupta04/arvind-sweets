// Footer component
import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiPhone, FiMail } from 'react-icons/fi';

function Footer() {
  const lat = Number(import.meta.env.VITE_SHOP_LAT);
  const lng = Number(import.meta.env.VITE_SHOP_LNG);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const placeIdRaw = import.meta.env.VITE_SHOP_PLACE_ID;
  const mapQueryRaw = import.meta.env.VITE_SHOP_MAP_QUERY;

  const placeId = placeIdRaw ? String(placeIdRaw).trim() : '';
  const mapQuery = mapQueryRaw ? String(mapQueryRaw).trim() : '';

  // Prefer an explicit place target (most accurate), then a query string, then lat/lng.
  const mapsQuery = placeId
    ? `place_id:${placeId}`
    : (mapQuery || (hasCoords ? `${lat},${lng}` : 'Arvind Sweets'));

  const mapsLink = placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}`;
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // Prefer the official Embed API (cleaner UI). Falls back to the generic embed if key is missing.
  const mapsEmbedSrc = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsApiKey)}&q=${encodeURIComponent(mapsQuery)}&zoom=16`
    : `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&z=16&output=embed`;

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Arvind Sweets</h3>
            <p className="text-gray-300 text-sm">
              Serving delicious sweets and Your trusted sweet shop for traditional and modern delicacies.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-300 hover:text-white">Home</Link></li>
              <li><Link to="/products" className="text-gray-300 hover:text-white">Products</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?category=Bengali Sweets" className="text-gray-300 hover:text-white">Bengali Sweets</Link></li>
              <li><Link to="/products?category=Dry Sweets" className="text-gray-300 hover:text-white">Dry Sweets</Link></li>
              <li><Link to="/products?category=Snacks" className="text-gray-300 hover:text-white">Snacks</Link></li>
              <li><Link to="/products?category=Seasonal" className="text-gray-300 hover:text-white">Seasonal</Link></li>
              <li><Link to="/products?category=Fastfood" className="text-gray-300 hover:text-white">Fastfood</Link></li>
              <li><Link to="/products?category=Beverages" className="text-gray-300 hover:text-white">Beverages</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <FiPhone className="w-4 h-4" />
                <span className="text-gray-300">+91 8083834895</span>
              </div>
              <div className="flex items-center space-x-2">
                <FiMail className="w-4 h-4" />
                <span className="text-gray-300" >arvindsweetshariharganj@gmail.com</span>
              </div>
            </div>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-white"><FiFacebook className="w-5 h-5" /></a>
              <a href="#" className="text-gray-300 hover:text-white"><FiTwitter className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/arvindsweets" className="text-gray-300 hover:text-white"><FiInstagram className="w-5 h-5" /></a>
            </div>

            <div className="mt-6">
              <h5 className="font-semibold mb-2">Shop Location</h5>
              <div className="rounded-xl overflow-hidden ring-1 ring-white/10 bg-gray-900">
                <iframe
                  title="Arvind Sweets location"
                  src={mapsEmbedSrc}
                  className="w-full aspect-video"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-sm text-gray-300 hover:text-white"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
          <p>&copy; 2025 Arvind Sweets. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
