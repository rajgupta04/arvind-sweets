// Home page component
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import { FiArrowRight } from 'react-icons/fi';

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await getProducts({ featured: 'true' });
      // Axios wraps response in data property
      const products = response.data || [];
      setFeaturedProducts(Array.isArray(products) ? products.slice(0, 6) : []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Set empty array on error so page still loads
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Welcome to Arvind Sweets 🍰</h1>
            <p className="text-xl mb-8">Tradition, Taste, and Quality Since 1990</p>
            <Link
              to="/products"
              className="inline-flex items-center bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Shop Now <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Shop Story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-6">Our Story</h2>
          <p className="text-gray-700 text-lg text-center max-w-3xl mx-auto">
            Arvind Sweets has been serving the community with authentic, handcrafted sweets for over 30 years. 
            We use traditional recipes passed down through generations, combined with the finest ingredients to bring you 
            the most delicious and memorable sweets. Every bite tells a story of love, tradition, and dedication to excellence.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Bengali Sweets', 'Dry Sweets', 'Snacks', 'Seasonal'].map((category) => (
              <Link
                key={category}
                to={`/products?category=${category}`}
                className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-transform hover:scale-105"
              >
                <div className="text-4xl mb-3">🍬</div>
                <h3 className="font-semibold text-gray-800">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Sweets</h2>
          <Link
            to="/products"
            className="text-orange-600 hover:text-orange-700 font-semibold flex items-center"
          >
            View All <FiArrowRight className="ml-1" />
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12">No featured products available</p>
        )}
      </div>

      {/* Special Offers */}
      <div className="bg-orange-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Special Diwali Offer! 🎉</h2>
          <p className="text-xl mb-6">Get 20% off on all sweets this festive season</p>
          <Link
            to="/products?category=Seasonal"
            className="inline-block bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Shop Seasonal Collection
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
