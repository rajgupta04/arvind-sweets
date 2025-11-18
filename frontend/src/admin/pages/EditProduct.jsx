// Edit Product Page
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import ProductForm from '../components/ProductForm';
import { getProductById, updateProduct } from '../services/adminApi';

function EditProduct() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchProduct();
  }, [user, navigate, id]);

  const fetchProduct = async () => {
    try {
      const data = await getProductById(id);
      const productData = data.data || data;
      setProduct(productData);
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product. Redirecting...');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (productData) => {
    setIsSaving(true);
    try {
      await updateProduct(id, productData);
      alert('Product updated successfully!');
      navigate('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 ml-64">
          <AdminNavbar />
          <main className="p-8 mt-16">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Edit Product</h1>
            <p className="text-gray-600 mt-2">Update product information</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <ProductForm
              initialData={product}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSaving}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default EditProduct;

