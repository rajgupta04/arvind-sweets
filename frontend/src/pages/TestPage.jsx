// TestPage component - fetches and displays sweets data
import React, { useState, useEffect } from 'react';
import API from '../services/api.js';

function TestPage() {
  const [sweets, setSweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSweets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await API.get('/sweets');
        setSweets(response.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch sweets data');
        console.error('Error fetching sweets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSweets();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading sweets...</h2>
        <p>Please wait while we fetch the data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error loading sweets</h2>
        <p>{error}</p>
        <p>Make sure the backend server is running on port 5000</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Arvind Sweets - Test Page 🍰</h1>
      <div style={{ marginTop: '20px' }}>
        <h2>Available Sweets:</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {sweets.map((sweet) => (
            <div
              key={sweet.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: '#fff'
              }}
            >
              <h3 style={{ marginTop: 0 }}>{sweet.name}</h3>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                ₹{sweet.price}
              </p>
            </div>
          ))}
        </div>
        {sweets.length === 0 && (
          <p>No sweets available at the moment.</p>
        )}
      </div>
    </div>
  );
}

export default TestPage;
