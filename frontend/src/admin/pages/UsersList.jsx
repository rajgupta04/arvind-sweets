import React, { useEffect, useMemo, useState } from 'react';
import { FiEye, FiTrash2, FiX } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { createUser, deleteUser, listUsers, updateUser } from '../services/adminApi';

const roleOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'delivery_boy', label: 'Delivery Boy' },
  { value: 'admin', label: 'Admin' },
];

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    sweetCoinBalance: '0',
  });

  const currentAdminId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?._id || u?.id || null;
    } catch {
      return null;
    }
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load users', e);
      showToast(e?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', role: 'customer', password: '', sweetCoinBalance: '0' });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u?.name || '',
      email: u?.email || '',
      phone: u?.phone || '',
      role: u?.role || 'customer',
      password: '',
      sweetCoinBalance: String(Number(u?.sweetCoinBalance) || 0),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm({ name: '', email: '', phone: '', role: 'customer', password: '', sweetCoinBalance: '0' });
  };

  const handleSave = async () => {
    const name = String(form.name || '').trim();
    const email = String(form.email || '').trim();

    const parsedSweetCoinBalance = Number(form.sweetCoinBalance);
    const sweetCoinBalanceIsValid =
      form.sweetCoinBalance !== '' && Number.isFinite(parsedSweetCoinBalance) && Number.isInteger(parsedSweetCoinBalance);

    if (!name || !email) {
      alert('Name and email are required');
      return;
    }

    if (!sweetCoinBalanceIsValid || parsedSweetCoinBalance < 0) {
      alert('SweetCoin balance must be a non-negative integer');
      return;
    }

    try {
      setSaving(true);

      if (editingUser?._id) {
        await updateUser(editingUser._id, {
          name,
          email,
          phone: form.phone,
          role: form.role,
          password: form.password,
          sweetCoinBalance: parsedSweetCoinBalance,
        });
        showToast('User updated');
      } else {
        await createUser({
          name,
          email,
          phone: form.phone,
          role: form.role,
          password: form.password,
          sweetCoinBalance: parsedSweetCoinBalance,
        });
        showToast('User created');
      }

      closeModal();
      fetchUsers();
    } catch (e) {
      console.error('Save user failed', e);
      alert(e?.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!u?._id) return;
    if (currentAdminId && String(u._id) === String(currentAdminId)) {
      alert("You can't delete your own admin account");
      return;
    }

    const ok = window.confirm(`Delete user ${u.email || u.name || u._id}?`);
    if (!ok) return;

    try {
      await deleteUser(u._id);
      showToast('User deleted');
      fetchUsers();
    } catch (e) {
      console.error('Delete user failed', e);
      alert(e?.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64">
        <AdminNavbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 sm:p-6 lg:p-8 mt-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Users</h1>
              <p className="text-gray-600 mt-2">Create, edit, and manage user accounts.</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
            >
              Add User
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Mobile: tile/cards */}
            <div className="md:hidden">
              {loading ? (
                <div className="px-4 py-10 text-center text-gray-500">Loading users…</div>
              ) : users.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">No users found.</div>
              ) : (
                <div className="divide-y">
                  {users.map((u) => (
                    <div key={u._id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{u.name}</div>
                          <div className="text-sm text-gray-600 truncate">{u.email}</div>
                          <div className="mt-1 text-sm text-gray-700">Phone: {u.phone || '—'}</div>
                          <div className="mt-1 text-sm text-gray-700">Role: {u.role || 'customer'}</div>
                          <div className="mt-1 text-sm text-gray-700">🪙 SweetCoin: {Number(u?.sweetCoinBalance) || 0}</div>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center justify-center px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="inline-flex items-center justify-center px-3 py-2 border rounded-lg text-red-700 hover:bg-red-50"
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">🪙 SweetCoin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                        Loading users…
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{u.phone || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{u.role || 'customer'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{Number(u?.sweetCoinBalance) || 0}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-2 px-3 py-1 border rounded-lg text-gray-700 hover:bg-gray-100"
                            >
                              <FiEye className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-xl font-semibold">{editingUser ? 'Edit User' : 'Add User'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-900">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🪙 SweetCoin Balance</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.sweetCoinBalance}
                  onChange={(e) => setForm((p) => ({ ...p, sweetCoinBalance: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Must be a non-negative integer.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? <span className="text-gray-500">(leave blank to keep unchanged)</span> : null}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={editingUser ? 'New password (optional)' : 'Password'}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-60"
                  disabled={saving}
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
