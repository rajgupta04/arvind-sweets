// ProductCard component
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { FiShoppingCart } from 'react-icons/fi';

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  const [activeImage, setActiveImage] = useState(
    product.images && product.images.length > 0 ? product.images[0] : null
  );

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);

    // Notification
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

  return (
    <Link to={`/products/${product._id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">

        {/* 🔥 IMAGE AREA WITH 3 HOVER ZONES */}
        <div
          className="relative h-48 bg-gray-200 group"
          onMouseLeave={() =>
            setActiveImage(product.images?.[0] || null)
          }
        >
          {/* ACTIVE IMAGE */}
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">🍰</span>
            </div>
          )}

          {/* LEFT ZONE */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 cursor-pointer"
            onMouseEnter={() =>
              setActiveImage(product.images?.[0])
            }
          ></div>

          {/* CENTER ZONE */}
          <div
            className="absolute inset-y-0 left-1/3 w-1/3 cursor-pointer"
            onMouseEnter={() =>
              product.images?.[1] && setActiveImage(product.images[1])
            }
          ></div>

          {/* RIGHT ZONE */}
          <div
            className="absolute inset-y-0 right-0 w-1/3 cursor-pointer"
            onMouseEnter={() =>
              product.images?.[2] && setActiveImage(product.images[2])
            }
          ></div>

          {/* DISCOUNT TAG */}
          {product.discount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
              {product.discount}% OFF
            </span>
          )}

          {/* FEATURED TAG */}
          {product.isFeatured && (
            <span className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold">
              Featured
            </span>
          )}
        </div>

        {/* PRODUCT DETAILS */}
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

            <span className="text-sm text-gray-600">
              {product.category}
            </span>
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
