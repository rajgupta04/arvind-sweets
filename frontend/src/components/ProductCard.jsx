// ProductCard component
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { FiShoppingCart } from 'react-icons/fi';

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);

  const [hoverIndex, setHoverIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  const images = product.images?.length > 0 ? product.images : [];

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);

    const notification = document.createElement('div');
    notification.className =
      'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = `${product.name} added to cart!`;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 2000);
  };

  const discountedPrice =
    product.discount > 0
      ? product.price - (product.price * product.discount) / 100
      : product.price;

  // 🟦 Hover Logic (Desktop)
  const handleMouseMove = (e) => {
    if (images.length < 2) return;

    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;

    const zoneWidth = width / images.length;
    const index = Math.floor(x / zoneWidth);

    setHoverIndex(index);
  };

  const handleMouseLeave = () => setHoverIndex(0);

  // 📱 Touch Swipe Logic (Mobile)
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;

    const diff = touchStartX - touchEndX;

    // Minimum required swipe length
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe Left → Next Image
        setHoverIndex((prev) =>
          prev + 1 < images.length ? prev + 1 : prev
        );
      } else {
        // Swipe Right → Previous Image
        setHoverIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
      }
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <Link to={`/products/${product._id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">

        {/* IMAGE SECTION */}
        <div
          className="relative h-48 bg-gray-200 cursor-pointer select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.length > 0 ? (
            <img
              src={images[hoverIndex] ?? images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">🍰</span>
            </div>
          )}

          {/* BADGES */}
          {product.discount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
              {product.discount}% OFF
            </span>
          )}

          {product.isFeatured && (
            <span className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold">
              Featured
            </span>
          )}
        </div>

        {/* TEXT CONTENT */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div>
              {product.discount > 0 ? (
                <div>
                  <span className="text-2xl font-bold text-orange-600">
                    ₹{discountedPrice.toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500 line-through ml-2">
                    ₹{product.price}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-orange-600">
                  ₹{product.price}
                </span>
              )}
              <p className="text-xs text-gray-500">{product.weight}</p>
            </div>
            <span className="text-sm text-gray-600">{product.category}</span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable || product.stock === 0}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FiShoppingCart className="w-4 h-4" />
            <span>
              {!product.isAvailable || product.stock === 0
                ? 'Out of Stock'
                : 'Add to Cart'}
            </span>
          </button>
        </div>

      </div>
    </Link>
  );
}

export default ProductCard;
