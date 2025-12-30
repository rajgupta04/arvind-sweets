import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import {
  assignDeliveryBoyToOrder,
  getAllOrders,
  generateDeliveryTrackingLink,
  listDeliveryBoyUsers,
  setOrderTrackingEnabled,
  updateOrderStatus,
} from '../services/adminApi';
import { FiEye, FiX } from 'react-icons/fi';
import { createSocket } from '../../services/socket';

const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Placed', 'Preparing', 'Out for Delivery'];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function OrdersList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveryBoysLoading, setDeliveryBoysLoading] = useState(false);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState('');
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState('');
  const [copyingLink, setCopyingLink] = useState(false);
  const [togglingTracking, setTogglingTracking] = useState(false);
  const audioRef = useRef(null);
  const lastOrderIdRef = useRef(null);
  const initializedRef = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    audioRef.current = new Audio('/order-notification.mp3');
    audioRef.current.load();
  }, []);

  const triggerBrowserNotification = (order) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const notify = () => {
      try {
        new Notification('New Order!', {
          body: `Order ID: ${order._id}`,
          tag: order._id
        });
      } catch (error) {
        console.warn('Notification error', error);
      }
    };

    if (Notification.permission === 'granted') {
      notify();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          notify();
        }
      });
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleIncomingOrder = (order) => {
    if (!order) return;
    showToast(`New Order Received: ${order._id}`);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    triggerBrowserNotification(order);
    fetchOrders(true);
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const token = (() => {
        try {
          return localStorage.getItem('token');
        } catch {
          return null;
        }
      })();

      if (!token) {
        setOrders([]);
        return;
      }

      const data = await getAllOrders();
      setOrders(data);

      if (data.length > 0) {
        const latestId = data[0]._id;
        if (initializedRef.current && latestId !== lastOrderIdRef.current) {
          handleIncomingOrder(data[0]);
        }
        lastOrderIdRef.current = latestId;
        if (!initializedRef.current) {
          initializedRef.current = true;
        }
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
        navigate('/login');
        return;
      }
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveryBoys = async () => {
    setDeliveryBoysLoading(true);
    try {
      const data = await listDeliveryBoyUsers();
      setDeliveryBoys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load delivery boys', error);
    } finally {
      setDeliveryBoysLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryBoys();
  }, []);

  useEffect(() => {
    const handleNewOrderEvent = (event) => {
      if (event.detail?._id) {
        lastOrderIdRef.current = event.detail._id;
        initializedRef.current = true;
      }
      handleIncomingOrder(event.detail);
    };

    const handleOrderCancelledEvent = (event) => {
      const order = event.detail;
      if (!order?._id) return;
      const reason = order?.cancellation?.reasonLabel || 'Cancelled';
      const extra = (order?.cancellation?.message || '').trim();
      showToast(`Order Cancelled: ${order._id} • ${reason}${extra ? ` • ${extra}` : ''}`);
      fetchOrders(true);
    };

    window.addEventListener('admin:new-order', handleNewOrderEvent);
    window.addEventListener('admin:order-cancelled', handleOrderCancelledEvent);
    return () => {
      window.removeEventListener('admin:new-order', handleNewOrderEvent);
      window.removeEventListener('admin:order-cancelled', handleOrderCancelledEvent);
    };
  }, []);

  const handleStatusChange = async (orderId, status) => {
    try {
      setUpdatingStatusId(orderId);
      await updateOrderStatus(orderId, status);
      showToast(`Order ${orderId} status updated to ${status}`);
      fetchOrders(true);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openModal = (order) => {
    setSelectedOrder(order);
    const assignedId = order?.assignedDeliveryBoy?._id || '';
    setSelectedDeliveryBoyId(assignedId);
    setLiveTrackingEnabled(Boolean(order?.liveTrackingEnabled));
    setLiveLocation(
      order?.lastDeliveryLocation?.lat
        ? {
            lat: order.lastDeliveryLocation.lat,
            lng: order.lastDeliveryLocation.lng,
            updatedAt: order.lastDeliveryLocation.updatedAt,
          }
        : null
    );
    setTrackingActive(false);
    setTrackingMessage('');
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setShowModal(false);
    setLiveLocation(null);
    setTrackingActive(false);
    setTrackingMessage('');
    try {
      socketRef.current?.disconnect();
    } catch {}
    socketRef.current = null;
  };

  useEffect(() => {
    if (!showModal || !selectedOrder?._id) return;

    const canTrack =
      selectedOrder.orderStatus === 'Out for Delivery' &&
      selectedOrder.liveTrackingEnabled === true;

    if (!canTrack) {
      setTrackingActive(false);
      setTrackingMessage('');
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
      return;
    }

    const socket = createSocket();
    socketRef.current = socket;

    const join = () => {
      socket.emit('joinOrder', { orderId: selectedOrder._id }, (ack) => {
        if (ack?.ok) {
          setTrackingActive(true);
          setTrackingMessage('Live tracking is active');
        } else {
          setTrackingActive(false);
          setTrackingMessage('Unable to join live tracking');
        }
      });
    };

    socket.on('connect', join);
    socket.on('orderLocationUpdate', (payload) => {
      if (!payload?.orderId || payload.orderId !== selectedOrder._id) return;
      const loc = payload.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        setLiveLocation({
          lat: loc.lat,
          lng: loc.lng,
          updatedAt: loc.updatedAt,
        });
      }
    });

    socket.on('trackingStopped', (payload) => {
      if (!payload?.orderId || payload.orderId !== String(selectedOrder._id)) return;
      setTrackingActive(false);
      setTrackingMessage('Tracking stopped');
    });

    socket.on('orderStatusUpdated', (payload) => {
      if (!payload?.orderId || payload.orderId !== String(selectedOrder._id)) return;
      if (payload.orderStatus === 'Delivered') {
        setTrackingActive(false);
        setTrackingMessage('Order delivered');
      }
    });

    if (socket.connected) join();

    return () => {
      try {
        socket.emit('leaveOrder', { orderId: selectedOrder._id });
        socket.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [showModal, selectedOrder?._id, selectedOrder?.orderStatus, selectedOrder?.liveTrackingEnabled]);

  const handleAssignDelivery = async () => {
    if (!selectedOrder?._id) return;
    try {
      setAssigningDelivery(true);
      const updated = await assignDeliveryBoyToOrder(selectedOrder._id, {
        deliveryBoyId: selectedDeliveryBoyId || null,
      });
      setSelectedOrder(updated);
      setLiveTrackingEnabled(Boolean(updated?.liveTrackingEnabled));
      setLiveLocation(
        updated?.lastDeliveryLocation?.lat
          ? {
              lat: updated.lastDeliveryLocation.lat,
              lng: updated.lastDeliveryLocation.lng,
              updatedAt: updated.lastDeliveryLocation.updatedAt,
            }
          : null
      );
      showToast('Delivery assignment updated');
      fetchOrders(true);
    } catch (error) {
      console.error('Failed to assign delivery', error);
      alert('Failed to update delivery assignment');
    } finally {
      setAssigningDelivery(false);
    }
  };

  const handleToggleTracking = async (enabled) => {
    if (!selectedOrder?._id) return;
    if (!selectedDeliveryBoyId) {
      setLiveTrackingEnabled(false);
      alert('Assign a delivery boy first');
      return;
    }

    try {
      setTogglingTracking(true);
      const updated = await setOrderTrackingEnabled(selectedOrder._id, enabled);
      setSelectedOrder(updated);
      setLiveTrackingEnabled(Boolean(updated?.liveTrackingEnabled));
      showToast(enabled ? 'Tracking resumed' : 'Tracking paused');
      fetchOrders(true);
    } catch (error) {
      console.error('Failed to toggle tracking', error);
      const msg = error?.response?.data?.message || 'Failed to toggle tracking';
      alert(msg);
      setLiveTrackingEnabled(Boolean(selectedOrder?.liveTrackingEnabled));
    } finally {
      setTogglingTracking(false);
    }
  };

  const copyText = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyTrackingLink = async () => {
    if (!selectedOrder?._id) return;
    if (!selectedDeliveryBoyId) {
      alert('Select a delivery boy first');
      return;
    }
    try {
      setCopyingLink(true);
      const data = await generateDeliveryTrackingLink(selectedOrder._id, { deliveryBoyId: selectedDeliveryBoyId });
      const url = data?.url;
      if (!url) {
        alert('Failed to generate link');
        return;
      }
      const ok = await copyText(url);
      if (ok) {
        showToast('Tracking link copied');
      } else {
        // Fallback so the admin can still share it
        window.prompt('Copy tracking link:', url);
      }
    } catch (error) {
      console.error('Failed to generate tracking link', error);
      alert(error?.response?.data?.message || 'Failed to generate tracking link');
    } finally {
      setCopyingLink(false);
    }
  };

  const renderStatusBadge = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Processing: 'bg-blue-100 text-blue-800',
      Shipped: 'bg-purple-100 text-purple-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
              <p className="text-gray-600 mt-2">Track, manage, and fulfill incoming orders.</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order._id}
                        className={
                          order.orderStatus === 'Cancelled'
                            ? 'bg-red-50 hover:bg-red-100'
                            : order.orderStatus === 'Delivered'
                              ? 'bg-green-50 hover:bg-green-100'
                              : 'hover:bg-gray-50'
                        }
                      >
                        <td
                          className={
                            `px-6 py-4 text-sm font-mono ` +
                            (order.orderStatus === 'Cancelled'
                              ? 'text-red-700 line-through'
                              : order.orderStatus === 'Delivered'
                                ? 'text-green-700'
                                : 'text-gray-900')
                          }
                        >
                          {order._id}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={
                              `text-sm font-medium ` +
                              (order.orderStatus === 'Cancelled'
                                ? 'text-red-700 line-through'
                                : order.orderStatus === 'Delivered'
                                  ? 'text-green-700'
                                  : 'text-gray-900')
                            }
                          >
                            {order.shippingAddress?.name || 'N/A'}
                          </div>
                          <div
                            className={
                              `text-sm ` +
                              (order.orderStatus === 'Cancelled'
                                ? 'text-red-600 line-through'
                                : order.orderStatus === 'Delivered'
                                  ? 'text-green-600'
                                  : 'text-gray-500')
                            }
                          >
                            {order.user?.email}
                          </div>
                        </td>
                        <td
                          className={
                            `px-6 py-4 text-sm font-semibold ` +
                            (order.orderStatus === 'Cancelled'
                              ? 'text-red-700 line-through'
                              : order.orderStatus === 'Delivered'
                                ? 'text-green-700'
                                : 'text-gray-900')
                          }
                        >
                          {formatCurrency(order.totalPrice)}
                        </td>
                        <td
                          className={
                            `px-6 py-4 text-sm ` +
                            (order.orderStatus === 'Cancelled'
                              ? 'text-red-600 line-through'
                              : order.orderStatus === 'Delivered'
                                ? 'text-green-600'
                                : 'text-gray-500')
                          }
                        >
                          {order.paymentMethod}
                        </td>
                        <td className="px-6 py-4">{renderStatusBadge(order.paymentStatus || 'Pending')}</td>
                        <td className="px-6 py-4">
                          <select
                            value={order.orderStatus}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className={
                              `border rounded-lg px-3 py-1 text-sm ` +
                              (order.orderStatus === 'Cancelled'
                                ? 'border-red-200 text-red-700'
                                : order.orderStatus === 'Delivered'
                                  ? 'border-green-200 text-green-700'
                                  : '')
                            }
                            disabled={updatingStatusId === order._id}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td
                          className={
                            `px-6 py-4 text-sm ` +
                            (order.orderStatus === 'Cancelled'
                              ? 'text-red-600 line-through'
                              : order.orderStatus === 'Delivered'
                                ? 'text-green-600'
                                : 'text-gray-500')
                          }
                        >
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => openModal(order)}
                            className={
                              `inline-flex items-center space-x-1 px-3 py-1 border rounded-lg hover:bg-gray-100 ` +
                              (order.orderStatus === 'Cancelled'
                                ? 'text-red-700 border-red-200'
                                : order.orderStatus === 'Delivered'
                                  ? 'text-green-700 border-green-200'
                                  : 'text-gray-700')
                            }
                          >
                            <FiEye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-24 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-xl font-semibold">Order Details - {selectedOrder._id}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Customer</h4>
                  <p className="text-gray-800">{selectedOrder.shippingAddress?.name}</p>
                  <p className="text-gray-600">{selectedOrder.user?.email}</p>
                  <p className="text-gray-600">{selectedOrder.shippingAddress?.phone}</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Shipping</h4>
                  <p className="text-gray-800">{selectedOrder.shippingAddress?.street}</p>
                  <p className="text-gray-600">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                    {selectedOrder.shippingAddress?.pincode}
                  </p>
                </div>
              </div>

              {(selectedOrder.orderStatus === 'Cancelled' || selectedOrder.cancellation?.reasonLabel) && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h4 className="text-lg font-semibold mb-2 text-red-800">Cancellation</h4>
                  <div className="text-sm text-gray-800 space-y-1">
                    <div>
                      <span className="font-semibold">Cancelled by:</span>{' '}
                      {selectedOrder.cancellation?.cancelledBy?.name
                        ? `${selectedOrder.cancellation.cancelledBy.name} (${selectedOrder.cancellation.cancelledBy.role || 'user'})`
                        : 'User'}
                    </div>
                    <div>
                      <span className="font-semibold">Reason:</span>{' '}
                      {selectedOrder.cancellation?.reasonLabel || '—'}
                    </div>
                    {selectedOrder.cancellation?.message ? (
                      <div>
                        <span className="font-semibold">Message:</span>{' '}
                        {selectedOrder.cancellation.message}
                      </div>
                    ) : null}
                    {selectedOrder.cancelledAt ? (
                      <div>
                        <span className="font-semibold">Cancelled at:</span>{' '}
                        {new Date(selectedOrder.cancelledAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-lg font-semibold mb-2">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.orderItems?.map((item) => (
                    <div key={`${selectedOrder._id}-${item.product || item.name}`} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items Price</span>
                  <span>{formatCurrency(selectedOrder.itemsPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>{formatCurrency(selectedOrder.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Delivery Assignment</h4>
                  <button
                    type="button"
                    onClick={fetchDeliveryBoys}
                    className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-50"
                    disabled={deliveryBoysLoading}
                  >
                    {deliveryBoysLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery boy</label>
                    <select
                      value={selectedDeliveryBoyId}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedDeliveryBoyId(next);
                        if (!next) {
                          setLiveTrackingEnabled(false);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {deliveryBoys.map((db) => (
                        <option key={db._id} value={db._id}>
                          {db.name}{db.phone ? ` (${db.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={liveTrackingEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setLiveTrackingEnabled(next);
                          handleToggleTracking(next);
                        }}
                        disabled={!selectedDeliveryBoyId || togglingTracking}
                      />
                      Tracking (pause / resume)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAssignDelivery}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-60"
                    disabled={assigningDelivery}
                  >
                    {assigningDelivery ? 'Saving...' : 'Save Assignment'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTrackingLink}
                    className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                    disabled={copyingLink || !selectedDeliveryBoyId}
                    title={!selectedDeliveryBoyId ? 'Select a delivery boy first' : 'Copy delivery tracking link'}
                  >
                    {copyingLink ? 'Copying...' : 'Copy Tracking Link'}
                  </button>

                  <div className="text-sm text-gray-600 flex items-center">
                    {selectedOrder.assignedDeliveryBoy ? (
                      <span>
                        Assigned: {selectedOrder.assignedDeliveryBoy?.name || '—'}
                      </span>
                    ) : (
                      <span>Assigned: —</span>
                    )}
                  </div>
                </div>

                {selectedOrder?.lastDeliveryLocation?.lat && (
                  <div className="text-sm text-gray-600">
                    Last location: {selectedOrder.lastDeliveryLocation.lat}, {selectedOrder.lastDeliveryLocation.lng}
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Live location</span>
                    <span className="text-gray-600">
                      {selectedOrder.liveTrackingEnabled
                        ? (trackingActive ? 'Active' : 'Unavailable')
                        : 'Not enabled'}
                    </span>
                  </div>

                  {trackingMessage && <div className="text-gray-600">{trackingMessage}</div>}
                  <div className="text-gray-700">
                    <span className="font-semibold">Last update:</span>{' '}
                    {liveLocation?.updatedAt
                      ? new Date(liveLocation.updatedAt).toLocaleString()
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersList;

