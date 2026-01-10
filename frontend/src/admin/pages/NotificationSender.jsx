import React, { useMemo, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import { sendAdminNotification } from '../services/adminApi';

const roleOptions = [
  { value: 'customer', label: 'Customers' },
  { value: 'delivery_boy', label: 'Delivery Boys' },
  { value: 'admin', label: 'Admins' },
];

export default function NotificationSender() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [audience, setAudience] = useState('all'); // all | role | user
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/');

  const canSubmit = useMemo(() => {
    const t = String(title || '').trim();
    const m = String(message || '').trim();
    if (!t && !m) return false;

    if (audience === 'user') {
      const e = String(email || '').trim();
      const id = String(userId || '').trim();
      return Boolean(e || id);
    }

    if (audience === 'role') {
      return Boolean(String(role || '').trim());
    }

    return true;
  }, [audience, email, userId, title, message, role]);

  const showToast = (text) => {
    setToastMessage(String(text || ''));
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSend = async () => {
    try {
      setSaving(true);
      const res = await sendAdminNotification({
        audience,
        role: audience === 'role' ? role : undefined,
        email: audience === 'user' ? email : undefined,
        userId: audience === 'user' ? userId : undefined,
        title,
        message,
        url,
      });
      showToast(res?.ok ? 'Notification sent' : 'Sent (unknown response)');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to send notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="pt-20 lg:pl-64 px-4 sm:px-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Send Test Notification</h2>
                <p className="text-sm text-gray-600 mt-1">For testing in-app notifications (not guaranteed if user is offline).</p>
              </div>
              {toastMessage ? (
                <div className="text-sm px-3 py-2 rounded-lg bg-gray-900 text-white">{toastMessage}</div>
              ) : null}
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="all">All users (online)</option>
                  <option value="role">By role (online)</option>
                  <option value="user">Specific user (online)</option>
                </select>
              </div>

              {audience === 'role' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {roleOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {audience === 'user' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User email (recommended)</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Or User ID</label>
                    <input
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Mongo ObjectId"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g. Test notification"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="w-full border rounded-lg px-3 py-2 min-h-[110px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Open URL (internal path)</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/products"
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Use paths like <span className="font-mono">/products</span> or <span className="font-mono">/orders</span>.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSubmit || saving}
                  className={
                    `px-4 py-2 rounded-lg text-white ` +
                    (canSubmit && !saving ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-400 cursor-not-allowed')
                  }
                >
                  {saving ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
