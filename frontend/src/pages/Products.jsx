// Product Listing page with filters
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [foodType, setFoodType] = useState(searchParams.get('foodType') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [didInitFromUrl, setDidInitFromUrl] = useState(false);

  const categories = ['Bengali Sweets', 'Dry Sweets', 'Snacks', 'Seasonal', 'Fastfood', 'Beverages', 'Special Offers'];

  // Fetch products function
  const fetchProducts = useCallback(async ({ nextCategory, nextSearch, nextMinPrice, nextMaxPrice, nextFoodType, mode = 'update' } = {}) => {
    try {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else {
        setFetching(true);
      }
      setError(null);
      const categoryParam = (nextCategory ?? category) || '';
      const searchParam = (nextSearch ?? search) || '';
      const minPriceParam = (nextMinPrice ?? minPrice) || '';
      const maxPriceParam = (nextMaxPrice ?? maxPrice) || '';
      const foodTypeParam = (nextFoodType ?? foodType) || '';
      
      const params = {};
      if (categoryParam) params.category = categoryParam;
      if (categoryParam === 'Fastfood' && foodTypeParam) params.foodType = foodTypeParam;
      if (searchParam) params.search = searchParam;
      if (minPriceParam) params.minPrice = minPriceParam;
      if (maxPriceParam) params.maxPrice = maxPriceParam;

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
      setInitialLoading(false);
      setFetching(false);
    }
  }, [category, maxPrice, minPrice, search]);

  // Fetch products when URL params change
  useEffect(() => {
    const categoryParam = searchParams.get('category') || '';
    const searchParam = searchParams.get('search') || '';
    const minPriceParam = searchParams.get('minPrice') || '';
    const maxPriceParam = searchParams.get('maxPrice') || '';
    const foodTypeParam = searchParams.get('foodType') || '';
    
    // Update state from URL params
    setCategory(categoryParam);
    setSearch(searchParam);
    setFoodType(foodTypeParam);
    setMinPrice(minPriceParam);
    setMaxPrice(maxPriceParam);
    setDidInitFromUrl(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Live search/filtering: fetch while typing/changing filters (no URL writes)
  useEffect(() => {
    if (!didInitFromUrl) return;

    const t = setTimeout(() => {
      fetchProducts({
        nextCategory: category,
        nextSearch: search,
        nextFoodType: foodType,
        nextMinPrice: minPrice,
        nextMaxPrice: maxPrice,
        mode: 'update',
      });
    }, 300);

    return () => clearTimeout(t);
  }, [category, didInitFromUrl, fetchProducts, foodType, maxPrice, minPrice, search]);

  useEffect(() => {
    if (category !== 'Fastfood' && foodType) {
      setFoodType('');
    }
  }, [category, foodType]);


  const handleSearch = (e) => {
    e.preventDefault();
    // Keep behavior: Enter / Search triggers immediate fetch
    fetchProducts({
      nextCategory: category,
      nextSearch: search,
      nextFoodType: foodType,
      nextMinPrice: minPrice,
      nextMaxPrice: maxPrice,
      mode: 'update',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setFoodType('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
    // fetchProducts will be called automatically via useEffect when searchParams changes
  };

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
                  const value = e.target.value;
                  setCategory(value);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {category === 'Fastfood' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Food Type</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFoodType('')}
                    className={
                      "px-3 py-2 border rounded-lg text-sm transition " +
                      (foodType === ''
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white hover:bg-gray-50')
                    }
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoodType('veg')}
                    className={
                      "px-3 py-2 border rounded-lg text-sm transition " +
                      (foodType === 'veg'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-300 hover:bg-green-50')
                    }
                  >
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoodType('nonveg')}
                    className={
                      "px-3 py-2 border rounded-lg text-sm transition " +
                      (foodType === 'nonveg'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-red-700 border-red-300 hover:bg-red-50')
                    }
                  >
                    Non-Veg
                  </button>
                </div>
              </div>
            ) : (
              <div />
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Min Price (₹)</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setMinPrice(value);
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
                  const value = e.target.value;
                  setMaxPrice(value);
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
      {initialLoading ? (
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

      {/* Keep context stable while fetching (don’t unmount the search bar) */}
      {fetching && !initialLoading ? (
        <div className="mt-6 text-center text-sm text-gray-500">
          Updating results…
        </div>
      ) : null}
    </div>
  );
}

export default Products;

