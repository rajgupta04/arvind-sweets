import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminSidebar from './components/AdminSidebar';
import AdminNavbar from './components/AdminNavbar';
import { getSettings, updateSettings } from './services/adminApi';
import { toast } from '../components/ui/use-toast';
import { Toaster } from '../components/ui/toaster';

function DeliverySettings() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [buffer, setBuffer] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    const fetch = async () => {
      try {
        const s = await getSettings();
        setBuffer(Number(s.deliveryBuffer || 10));
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, navigate]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const value = Math.max(5, Math.min(30, Number(buffer)));
      await updateSettings({ deliveryBuffer: value });
      toast({ title: 'Saved', description: 'Delivery buffer time updated successfully.' });
    } catch (err) {
      console.error('Failed to save settings', err);
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <AdminNavbar />
        <main className="p-8 mt-16">
          <div className="max-w-xl bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Delivery Settings</h1>
            <p className="text-gray-600 mb-6">Adjust the delivery buffer time used for ETA calculations.</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="range"
              min={5}
              max={30}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full mt-4"
            />
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </div>
  );
}

export default DeliverySettings;
