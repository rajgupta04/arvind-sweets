// Product Form Component - Reusable form for Add/Edit Product
import React, { useState, useEffect } from 'react';
import { uploadToCloudinary } from '../services/cloudinaryUpload';
import { FiX, FiUpload, FiImage } from 'react-icons/fi';
import { getOptimizedImageUrl } from '../../lib/cloudinary.js';
import { getAllProducts } from '../services/adminApi';

function ProductForm({ initialData = null, onSubmit, onCancel, isLoading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Bengali Sweets',
    foodType: '',
    price: '',
    discount: 0,
    weight: '250g',
    stock: '',
    isAvailable: true,
    isFeatured: false,
    featuredRank: '',
    isSuggested: false,
    suggestedWith: [],
    images: []
  });

  const [allProducts, setAllProducts] = useState([]);
  const [suggestSearch, setSuggestSearch] = useState('');

  const [uploadingImages, setUploadingImages] = useState(false);

  const categories = [
    'Bengali Sweets',
    'Dry Sweets',
    'Snacks',
    'Seasonal',
    'Fastfood',
    'Beverages',
    'Special Offers'
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || 'Bengali Sweets',
        foodType: initialData.foodType || '',
        price: initialData.price || '',
        discount: initialData.discount || 0,
        weight: initialData.weight || '250g',
        stock: initialData.stock || '',
        isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
        isFeatured: initialData.isFeatured || false,
        featuredRank: initialData.featuredRank ?? '',
        isSuggested: initialData.isSuggested || false,
        suggestedWith: Array.isArray(initialData.suggestedWith) ? initialData.suggestedWith : [],
        images: initialData.images || []
      });
    }
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getAllProducts();
        if (!cancelled) setAllProducts(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAllProducts([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  useEffect(() => {
    if (formData.category !== 'Fastfood' && formData.foodType) {
      setFormData(prev => ({ ...prev, foodType: '' }));
    }
  }, [formData.category, formData.foodType]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 images total
    const remainingSlots = 5 - formData.images.length;
    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image(s). Maximum 5 images allowed.`);
      return;
    }

    setUploadingImages(true);
    
    try {
      // Get upload preset from environment or use default
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || null;
      
      // Upload each file to Cloudinary
      const uploadPromises = files.map(file => uploadToCloudinary(file, uploadPreset));
      const newUrls = await Promise.all(uploadPromises);
      
      // Update form data with new image URLs
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newUrls]
      }));
      
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
      discount: Number(formData.discount),
      featuredRank:
        formData.isFeatured && String(formData.featuredRank).trim() !== ''
          ? Number(formData.featuredRank)
          : null,
    };

    if (submitData.category !== 'Fastfood') {
      delete submitData.foodType;
    } else if (!submitData.foodType) {
      delete submitData.foodType;
    }

    if (!submitData.isSuggested) {
      submitData.suggestedWith = [];
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Enter product name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          required
          rows="4"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Enter product description"
        />
      </div>

      {/* Category and Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Discount and Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount (%)
          </label>
          <input
            type="number"
            name="discount"
            value={formData.discount}
            onChange={handleInputChange}
            min="0"
            max="100"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight
          </label>
          <input
            type="text"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="250g"
          />
        </div>
      </div>

      {/* Stock */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stock <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          name="stock"
          value={formData.stock}
          onChange={handleInputChange}
          required
          min="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="0"
        />
      </div>

      {/* Images Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Images (Max 5)
        </label>
        <div className="space-y-4">
          {/* Image Previews */}
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {formData.images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={getOptimizedImageUrl(imageUrl)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {formData.images.length < 5 && (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploadingImages ? (
                  <div className="text-orange-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-sm">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploadingImages || formData.images.length >= 5}
              />
            </label>
          )}
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            name="isAvailable"
            checked={formData.isAvailable}
            onChange={handleInputChange}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Available</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            name="isFeatured"
            checked={formData.isFeatured}
            onChange={handleInputChange}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Featured</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            name="isSuggested"
            checked={formData.isSuggested}
            onChange={handleInputChange}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Suggested</span>
        </label>
      </div>

      {formData.isFeatured && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Featured Rank (1 = first)
          </label>
          <input
            type="number"
            name="featuredRank"
            value={formData.featuredRank}
            onChange={handleInputChange}
            min="1"
            step="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="e.g. 1"
          />
          <p className="mt-1 text-xs text-gray-500">Lower rank shows earlier in the Featured section.</p>
        </div>
      )}

      {formData.isSuggested && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Suggested With (pick products)
          </label>

          <input
            type="text"
            value={suggestSearch}
            onChange={(e) => setSuggestSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Search products to link..."
          />

          {formData.suggestedWith.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.suggestedWith.map((id) => {
                const p = allProducts.find((x) => x._id === id);
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        suggestedWith: prev.suggestedWith.filter((x) => x !== id),
                      }))
                    }
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs hover:bg-gray-200"
                    title="Remove"
                  >
                    <span className="truncate max-w-[180px]">{p?.name || id}</span>
                    <span className="text-gray-500">×</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">No linked products yet.</p>
          )}

          <div className="mt-3 max-h-48 overflow-auto border border-gray-200 rounded-lg">
            {allProducts
              .filter((p) => p && p._id)
              .filter((p) => (initialData?._id ? p._id !== initialData._id : true))
              .filter((p) => {
                const q = suggestSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  String(p.name || '').toLowerCase().includes(q) ||
                  String(p.category || '').toLowerCase().includes(q)
                );
              })
              .slice(0, 50)
              .map((p) => {
                const checked = formData.suggestedWith.includes(p._id);
                return (
                  <label
                    key={p._id}
                    className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setFormData((prev) => {
                          const exists = prev.suggestedWith.includes(p._id);
                          return {
                            ...prev,
                            suggestedWith: exists
                              ? prev.suggestedWith.filter((x) => x !== p._id)
                              : [...prev.suggestedWith, p._id],
                          };
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 truncate">{p.category}</div>
                    </div>
                  </label>
                );
              })}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            These products will appear in Cart suggestions when this item is in cart.
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <span>{initialData ? 'Update Product' : 'Create Product'}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;

