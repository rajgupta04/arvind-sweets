import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getMyDeliveryPackages } from '../services/deliveryService';

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function DeliveryMyPackages() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getMyDeliveryPackages();
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load assigned orders');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Packages</h1>
            <p className="text-sm text-gray-600">Signed in as {user?.name || 'Delivery Boy'}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
          >
            Home
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-6 text-red-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">No assigned orders yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{o._id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium">{o.shippingAddress?.name || o.user?.name || '—'}</div>
                        <div className="text-gray-500">{o.shippingAddress?.phone || o.user?.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{o.orderStatus || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(o.totalPrice)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/delivery/orders/${o._id}`)}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
