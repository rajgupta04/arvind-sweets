// ProductDetail page component
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { CartContext } from '../context/CartContext';
import Loader from '../components/Loader';
import { FiShoppingCart, FiArrowLeft } from 'react-icons/fi';
import { getAdminThumbUrl, getOptimizedImageUrl } from '../lib/cloudinary.js';
import { PublicSettingsContext } from '../context/PublicSettingsContext';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { publicSettings } = useContext(PublicSettingsContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedPricingOptionId, setSelectedPricingOptionId] = useState('');

  const showProductQuantity = useMemo(() => {
    const flag = publicSettings?.ui?.showProductQuantity;
    return flag !== false;
  }, [publicSettings]);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await getProductById(id);
      const productData = response.data;
      setProduct(productData);
      // Default to the main/base option (product.price)
      setSelectedPricingOptionId('');
      if (productData && productData.images && productData.images.length > 0) {
        setSelectedImage(0);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const opts = Array.isArray(product?.pricingOptions) ? product.pricingOptions : [];
    const selectedOpt = selectedPricingOptionId
      ? opts.find((o) => String(o?._id) === String(selectedPricingOptionId))
      : null;

    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedOpt ? {
        pricingOptionId: String(selectedOpt._id),
        pricingOptionLabel: String(selectedOpt.label || '').trim(),
        pricingOptionPrice: Number(selectedOpt.price),
      } : undefined);
    }
    // Show notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = `${quantity} x ${product.name} added to cart!`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 2000);
  };

  if (loading) {
    return <Loader />;
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-xl text-gray-500">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 text-orange-600 hover:text-orange-700"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const productPricingOptions = Array.isArray(product?.pricingOptions) ? product.pricingOptions : [];
  const selectedPricingOption = selectedPricingOptionId
    ? productPricingOptions.find((o) => String(o?._id) === String(selectedPricingOptionId))
    : null;
  const basePrice = selectedPricingOption ? Number(selectedPricingOption.price) : Number(product.price);
  const discountedPrice = product.discount > 0
    ? basePrice - (basePrice * product.discount / 100)
    : basePrice;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-800"
      >
        <FiArrowLeft className="mr-2" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            {product.images && product.images.length > 0 ? (
              <img
                src={getOptimizedImageUrl(product.images[selectedImage])}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
                <span className="text-8xl">🍰</span>
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`border-2 rounded-lg overflow-hidden ${
                    selectedImage === index ? 'border-orange-600' : 'border-gray-300'
                  }`}
                >
                  <img src={getAdminThumbUrl(image)} alt={`${product.name} ${index + 1}`} className="w-20 h-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{product.name}</h1>
          <div className="mb-4">
            {product.discount > 0 ? (
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-bold text-orange-600">₹{discountedPrice.toFixed(0)}</span>
                <span className="text-xl text-gray-500 line-through">₹{basePrice}</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
                  {product.discount}% OFF
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-orange-600">₹{basePrice}</span>
            )}
            <p className="text-gray-600 mt-2">
              Buying option:{' '}
              <span className="font-semibold">
                {selectedPricingOption?.label
                  ? selectedPricingOption.label
                  : (product.weight || 'Default')}
              </span>
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">{product.description}</p>
          </div>

          {product.ingredients && product.ingredients.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Ingredients:</h3>
              <ul className="list-disc list-inside text-gray-600">
                {product.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6">
            {(productPricingOptions.length > 0) && (
              <div className="flex items-center gap-4 mb-4">
                <label className="font-semibold">Buying option:</label>
                <select
                  value={selectedPricingOptionId}
                  onChange={(e) => setSelectedPricingOptionId(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">
                    {(product.weight || 'Default')} — ₹{Number(product.price).toFixed(0)}
                  </option>
                  {productPricingOptions.map((o) => (
                    <option key={o._id} value={String(o._id)}>
                      {o.label} — ₹{Number(o.price).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center space-x-4 mb-4">
              <label className="font-semibold">Quantity:</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-200 px-3 py-1 rounded"
                >
                  -
                </button>
                <span className="px-4 py-1 border rounded">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="bg-gray-200 px-3 py-1 rounded"
                >
                  +
                </button>
              </div>
              {showProductQuantity && (
                <span className="text-gray-600">({product.stock} available)</span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable || product.stock === 0}
            className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FiShoppingCart className="w-5 h-5" />
            <span>
              {!product.isAvailable || product.stock === 0
                ? 'Out of Stock'
                : `Add ${quantity} to Cart`}
            </span>
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Category:</span> {product.category}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold">Availability:</span>{' '}
              {product.isAvailable && product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
