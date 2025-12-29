// Redis-ready tracking store (in-memory implementation)

class InMemoryTrackingStore {
  constructor() {
    this._map = new Map();
  }

  async set(orderId, location) {
    if (!orderId) return;
    const key = String(orderId);
    this._map.set(key, location);
  }

  async get(orderId) {
    if (!orderId) return null;
    const key = String(orderId);
    return this._map.get(key) || null;
  }

  async clear(orderId) {
    if (!orderId) return;
    this._map.delete(String(orderId));
  }
}

export const trackingStore = new InMemoryTrackingStore();
