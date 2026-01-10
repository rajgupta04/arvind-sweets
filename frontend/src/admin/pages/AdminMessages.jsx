import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getAllMessages } from '../../services/messageService.js';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar.jsx';

function AdminMessages() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchMessages();
  }, [user, navigate]);

  const fetchMessages = async () => {
    try {
      const response = await getAllMessages();
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64">
        <AdminNavbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 sm:p-6 lg:p-8 mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Customer Messages</h1>
              <p className="text-gray-600 mt-2">All inquiries and feedback submitted via Contact Us</p>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg shadow p-6">Loading...</div>
            ) : (
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-gray-600">No messages yet.</div>
                ) : (
                  messages.map((m) => (
                    <div key={m._id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{m.name}</h3>
                          <p className="text-sm text-gray-600">{m.email} {m.phone ? `• ${m.phone}` : ''}</p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="inline-block bg-orange-50 text-orange-700 text-xs font-medium px-2 py-1 rounded">{m.subject}</span>
                      </div>
                      <p className="mt-4 text-gray-700 whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminMessages;

