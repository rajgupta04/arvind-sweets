import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from '../services/adminApi';
import { uploadToCloudinary } from '../services/cloudinaryUpload';
import { getOptimizedImageUrl } from '../../lib/cloudinary.js';

const toInputDateTimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const fromInputDateTimeLocal = (v) => {
  const s = String(v || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export default function CouponsList() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    imageUrl: '',
    discountType: 'flat',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscount: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
    showOnLoginPopup: false,
    usageLimit: '',
    perUserLimit: 1,
  });

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await listCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load coupons', e);
      showToast(e?.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setUploadingImage(false);
    setForm({
      code: '',
      title: '',
      description: '',
      imageUrl: '',
      discountType: 'flat',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscount: '',
      startsAt: '',
      endsAt: '',
      isActive: true,
      showOnLoginPopup: false,
      usageLimit: '',
      perUserLimit: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setUploadingImage(false);
    setForm({
      code: c?.code || '',
      title: c?.title || '',
      description: c?.description || '',
      imageUrl: c?.imageUrl || '',
      discountType: c?.discountType || 'flat',
      discountValue: c?.discountValue ?? 0,
      minOrderValue: c?.minOrderValue ?? 0,
      maxDiscount: c?.maxDiscount ?? '',
      startsAt: toInputDateTimeLocal(c?.startsAt),
      endsAt: toInputDateTimeLocal(c?.endsAt),
      isActive: Boolean(c?.isActive),
      showOnLoginPopup: Boolean(c?.showOnLoginPopup),
      usageLimit: c?.usageLimit ?? '',
      perUserLimit: c?.perUserLimit ?? 1,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleCouponImageUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || null;
      const url = await uploadToCloudinary(file, uploadPreset, {
        folder: 'arvind-sweets/coupons',
        maxWidth: 1200,
      });
      if (url) {
        setForm((p) => ({ ...p, imageUrl: url }));
      }
    } catch (err) {
      console.error('Coupon image upload error:', err);
      alert('Failed to upload coupon image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (e?.target) e.target.value = '';
    }
  };

  const canShowMaxDiscount = form.discountType === 'percent';

  const valueLabel = useMemo(() => {
    const v = Number(form.discountValue) || 0;
    return form.discountType === 'percent' ? `${v}%` : `₹${v}`;
  }, [form.discountType, form.discountValue]);

  const onSave = async () => {
    if (!form.code.trim()) {
      alert('Coupon code is required');
      return;
    }
    if (!form.discountType) {
      alert('Discount type is required');
      return;
    }

    const payload = {
      code: form.code.trim(),
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      minOrderValue: Number(form.minOrderValue) || 0,
      maxDiscount: canShowMaxDiscount ? (form.maxDiscount === '' ? '' : Number(form.maxDiscount)) : '',
      startsAt: fromInputDateTimeLocal(form.startsAt),
      endsAt: fromInputDateTimeLocal(form.endsAt),
      isActive: Boolean(form.isActive),
      showOnLoginPopup: Boolean(form.showOnLoginPopup),
      usageLimit: form.usageLimit === '' ? '' : Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1,
    };

    try {
      setSaving(true);
      if (editing?._id) {
        await updateCoupon(editing._id, payload);
        showToast('Coupon updated');
      } else {
        await createCoupon(payload);
        showToast('Coupon created');
      }
      closeModal();
      fetchCoupons();
    } catch (e) {
      console.error('Save coupon failed', e);
      alert(e?.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c) => {
    const ok = window.confirm(`Delete coupon ${c.code || c._id}?`);
    if (!ok) return;
    try {
      await deleteCoupon(c._id);
      showToast('Coupon deleted');
      fetchCoupons();
    } catch (e) {
      console.error('Delete coupon failed', e);
      alert(e?.response?.data?.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />

        <main className="p-8 mt-16">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Coupons</h1>
              <p className="text-gray-600 mt-2">Create and manage live coupon codes and login popup coupons.</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              Add Coupon
            </button>
          </div>

          {toastMessage ? (
            <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
              {toastMessage}
            </div>
          ) : null}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popup</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-500">Loading coupons…</td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No coupons found.</td>
                    </tr>
                  ) : (
                    coupons.map((c) => (
                      <tr key={c._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{c.code}</div>
                          {c.title ? <div className="text-sm text-gray-500">{c.title}</div> : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                          {c.discountType === 'percent' && typeof c.maxDiscount === 'number' ? (
                            <div className="text-xs text-gray-500">Max ₹{c.maxDiscount}</div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">₹{Number(c.minOrderValue || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {c.showOnLoginPopup ? (
                            <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200">Yes</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-200">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {c.isActive ? (
                            <span className="px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">Active</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-200">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{Number(c.usageCount || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEdit(c)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 mr-2"
                          >
                            <FiEdit2 /> Edit
                          </button>
                          <button
                            onClick={() => onDelete(c)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <FiTrash2 /> Delete
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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-semibold">{editing ? `Edit Coupon (${editing.code})` : 'Add Coupon'}</h3>
              <button onClick={closeModal} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
                <FiX />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="TEFFESNEW50"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Get flat ₹50 off"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Minimum order value ₹600"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Image (optional)</label>

                {form.imageUrl ? (
                  <div className="mb-3">
                    <div className="relative w-full h-40 rounded-lg border bg-gray-50 overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(form.imageUrl)}
                        alt="Coupon"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                        aria-label="Remove image"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3 mb-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-50">
                    <FiUpload />
                    <span className="text-sm">{uploadingImage ? 'Uploading…' : 'Upload Image'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCouponImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                  <span className="text-xs text-gray-500">PNG/JPG up to 10MB</span>
                </div>

                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value, maxDiscount: '' }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="flat">Flat</option>
                  <option value="percent">Percent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value ({valueLabel})</label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                <input
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                <input
                  type="number"
                  value={canShowMaxDiscount ? form.maxDiscount : ''}
                  onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
                  disabled={!canShowMaxDiscount}
                  placeholder={canShowMaxDiscount ? 'Optional' : 'Only for % coupons'}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit</label>
                <input
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                <input
                  type="number"
                  value={form.perUserLimit}
                  onChange={(e) => setForm((p) => ({ ...p, perUserLimit: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  Active
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.showOnLoginPopup}
                    onChange={(e) => setForm((p) => ({ ...p, showOnLoginPopup: e.target.checked }))}
                  />
                  Show as login popup
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
