// Products List Page - View all products with Edit/Delete
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { getAllProducts, deleteProduct } from '../services/adminApi';
import { FiEdit, FiTrash2, FiPlus, FiImage, FiPackage } from 'react-icons/fi';
import { getAdminThumbUrl } from '../../lib/cloudinary.js';

function ProductsList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  const fetchProducts = async () => {
    try {
      const data = await getAllProducts();
      const productList = Array.isArray(data) ? data : data.data || [];
      setProducts(productList);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteProduct(id);
      // Remove from local state
      setProducts(products.filter(p => p._id !== id));
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id) => {
    navigate(`/admin/products/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64">
          <AdminNavbar onMenuClick={() => setSidebarOpen((v) => !v)} />
          <main className="p-4 sm:p-6 lg:p-8 mt-16">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64">
        <AdminNavbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 sm:p-6 lg:p-8 mt-16">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">All Products</h1>
              <p className="text-gray-600 mt-2">Manage your product inventory</p>
            </div>
            <button
              onClick={() => navigate('/admin/products/add')}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 shadow-md"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Product</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {products.length === 0 ? (
              <div className="p-12 text-center">
                <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No products found</p>
                <button
                  onClick={() => navigate('/admin/products/add')}
                  className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
                >
                  Add your first product
                </button>
              </div>
            ) : (
              <>
                {/* Mobile tiles */}
                <div className="md:hidden divide-y">
                  {products.map((product) => (
                    <div key={product._id} className="p-4">
                      <div className="flex gap-4">
                        <div className="shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={getAdminThumbUrl(product.images[0])}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <FiImage className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                              <div className="text-sm text-gray-600">{product.category}</div>
                              <div className="mt-1 text-sm text-gray-900 font-medium">₹{product.price}</div>
                              <div className="mt-1 text-sm text-gray-700">Stock: {product.stock}</div>
                              <div className="mt-1">
                                <span
                                  className={
                                    `inline-flex px-2 py-1 text-xs font-semibold rounded-full ` +
                                    (product.isAvailable && product.stock > 0
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800')
                                  }
                                >
                                  {product.isAvailable && product.stock > 0 ? 'Available' : 'Out of Stock'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col gap-2">
                              <button
                                onClick={() => handleEdit(product._id)}
                                className="px-3 py-2 border rounded-lg text-blue-700 hover:bg-blue-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                disabled={deletingId === product._id}
                                className="px-3 py-2 border rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === product._id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.images && product.images.length > 0 ? (
                            <img
                                  src={getAdminThumbUrl(product.images[0])}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <FiImage className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.isFeatured && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded">
                              Featured{Number.isFinite(Number(product.featuredRank)) ? ` #${Number(product.featuredRank)}` : ''}
                            </span>
                          )}
                          {product.isSuggested && (
                            <span className="inline-block mt-1 ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              Suggested
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{product.price}
                          </div>
                          {product.discount > 0 && (
                            <div className="text-xs text-red-600">
                              {product.discount}% off
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.isAvailable && product.stock > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.isAvailable && product.stock > 0 ? 'Available' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleEdit(product._id)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit"
                            >
                              <FiEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id)}
                              disabled={deletingId === product._id}
                              className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === product._id ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                              ) : (
                                <FiTrash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductsList;

