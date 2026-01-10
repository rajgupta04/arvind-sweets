import React, { useEffect, useState } from 'react';
import { FiEye, FiTrash2, FiX } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { createOffer, deleteOffer, listOffers, updateOffer } from '../services/adminApi';

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

export default function OffersList() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    ctaText: '',
    ctaLink: '',
    active: false,
    startsAt: '',
    endsAt: '',
  });

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await listOffers();
      setOffers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load offers', e);
      showToast(e?.response?.data?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const openCreate = () => {
    setEditingOffer(null);
    setForm({
      title: '',
      description: '',
      ctaText: '',
      ctaLink: '',
      active: false,
      startsAt: '',
      endsAt: '',
    });
    setModalOpen(true);
  };

  const openEdit = (o) => {
    setEditingOffer(o);
    setForm({
      title: o?.title || '',
      description: o?.description || '',
      ctaText: o?.ctaText || '',
      ctaLink: o?.ctaLink || '',
      active: Boolean(o?.active),
      startsAt: toInputDateTimeLocal(o?.startsAt),
      endsAt: toInputDateTimeLocal(o?.endsAt),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOffer(null);
  };

  const handleSave = async () => {
    const title = String(form.title || '').trim();
    if (!title) {
      alert('Title is required');
      return;
    }

    const payload = {
      title,
      description: form.description,
      ctaText: form.ctaText,
      ctaLink: form.ctaLink,
      active: Boolean(form.active),
      startsAt: fromInputDateTimeLocal(form.startsAt),
      endsAt: fromInputDateTimeLocal(form.endsAt),
    };

    try {
      setSaving(true);
      if (editingOffer?._id) {
        await updateOffer(editingOffer._id, payload);
        showToast('Offer updated');
      } else {
        await createOffer(payload);
        showToast('Offer created');
      }
      closeModal();
      fetchOffers();
    } catch (e) {
      console.error('Save offer failed', e);
      alert(e?.response?.data?.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o) => {
    if (!o?._id) return;
    const ok = window.confirm(`Delete offer ${o.title || o._id}?`);
    if (!ok) return;

    try {
      await deleteOffer(o._id);
      showToast('Offer deleted');
      fetchOffers();
    } catch (e) {
      console.error('Delete offer failed', e);
      alert(e?.response?.data?.message || 'Failed to delete offer');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64">
        <AdminNavbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 sm:p-6 lg:p-8 mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Offers</h1>
              <p className="text-gray-600 mt-2">Create and manage seasonal offers shown on the Home page.</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
            >
              Add Offer
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile: tiles */}
            <div className="md:hidden">
              {loading ? (
                <div className="px-4 py-10 text-center text-gray-500">Loading offers…</div>
              ) : offers.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">No offers found.</div>
              ) : (
                <div className="divide-y">
                  {offers.map((o) => (
                    <div key={o._id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{o.title}</div>
                          <div className="mt-1 text-sm">
                            {o.active ? (
                              <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Inactive</span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-gray-700">Starts: {o.startsAt ? new Date(o.startsAt).toLocaleString() : '—'}</div>
                          <div className="text-sm text-gray-700">Ends: {o.endsAt ? new Date(o.endsAt).toLocaleString() : '—'}</div>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(o)}
                            className="px-3 py-2 border rounded-lg text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Starts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ends</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Loading offers…</td>
                    </tr>
                  ) : offers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-500">No offers found.</td>
                    </tr>
                  ) : (
                    offers.map((o) => (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.title}</td>
                        <td className="px-6 py-4 text-sm">
                          {o.active ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">Active</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{o.startsAt ? new Date(o.startsAt).toLocaleString() : '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{o.endsAt ? new Date(o.endsAt).toLocaleString() : '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEdit(o)}
                              className="inline-flex items-center gap-2 px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-100"
                            >
                              <FiEye className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(o)}
                              className="inline-flex items-center gap-2 px-3 py-1 border rounded-lg text-red-700 hover:bg-red-50"
                            >
                              <FiTrash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
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

      {toastMessage && (
        <div className="fixed top-24 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-xl font-semibold">{editingOffer ? 'Edit Offer' : 'Add Offer'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Special Diwali Offer! 🎉"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Get 20% off on all sweets this festive season"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                  <input
                    value={form.ctaText}
                    onChange={(e) => setForm((p) => ({ ...p, ctaText: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Shop Seasonal Collection"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                  <input
                    value={form.ctaLink}
                    onChange={(e) => setForm((p) => ({ ...p, ctaLink: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="/products?category=Seasonal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="offerActive"
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                <label htmlFor="offerActive" className="text-sm text-gray-700">
                  Active (only one offer can be active at a time)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
