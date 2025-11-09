// Product Listing page with filters
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['Bengali Sweets', 'Dry Sweets', 'Snacks', 'Seasonal', 'Special Offers'];

  // Fetch products function
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const categoryParam = searchParams.get('category') || '';
      const searchParam = searchParams.get('search') || '';
      
      const params = {};
      if (categoryParam) params.category = categoryParam;
      if (searchParam) params.search = searchParam;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      console.log('Fetching products with params:', params);
      const response = await getProducts(params);
      console.log('API Response:', response);
      
      // Axios wraps response in data property
      const products = response.data || [];
      console.log('Products received:', products.length, products);
      
      if (products.length === 0 && !categoryParam && !searchParam) {
        setError('No products available. Please check if the backend server is running on port 5000.');
      }
      
      setProducts(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.message || error.message || 'Failed to fetch products. Make sure the backend server is running.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch products when URL params change
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    
    // Update state from URL params
    if (categoryParam !== null) setCategory(categoryParam);
    if (searchParam !== null) setSearch(searchParam);
    
    // Fetch products with new params
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  const handleFilterChange = () => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleFilterChange();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
    // fetchProducts will be called automatically via useEffect when searchParams changes
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Our Sweets Collection</h1>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sweets..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              type="submit"
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              Search
            </button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <FiFilter />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  handleFilterChange();
                }}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Price (₹)</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  handleFilterChange();
                }}
                placeholder="1000"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="md:col-span-3 flex justify-end space-x-2">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <FiX />
                <span>Clear Filters</span>
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Count */}
      {products.length > 0 && (
        <div className="mb-6 text-gray-600">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader />
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {error ? (
            <>
              <p className="text-xl text-red-600 mb-4">{error}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                <p className="font-semibold mb-2">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Open terminal in the <code className="bg-gray-100 px-1 rounded">backend</code> folder</li>
                  <li>Run: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                  <li>Verify: Open <code className="bg-gray-100 px-1 rounded">http://localhost:5000/api/products</code> in browser</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl text-gray-500 mb-4">No products found</p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                Clear filters and show all products
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Products;

