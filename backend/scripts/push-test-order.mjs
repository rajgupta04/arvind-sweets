const base = process.env.API_BASE || 'http://localhost:5000';

async function main() {
  const productsRes = await fetch(`${base}/api/products`);
  if (!productsRes.ok) {
    const t = await productsRes.text();
    throw new Error(`GET /api/products failed: ${productsRes.status} ${t}`);
  }
  const products = await productsRes.json();
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products returned from /api/products');
  }

  const product = products[0];
  const productId = product?._id;
  if (!productId) throw new Error('First product missing _id');

  // Use Pickup to avoid GPS/location requirements in createOrder.
  const body = {
    orderItems: [{ product: productId, quantity: 1 }],
    shippingAddress: {
      name: 'Push Test User',
      phone: '9999999999',
      street: 'Test Pickup',
      city: 'Test',
      state: 'Test',
      pincode: '000000',
    },
    paymentMethod: 'Pickup',
    deliveryType: 'Pickup',
    paymentStatus: 'Pending',
  };

  const createRes = await fetch(`${base}/api/orders/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await createRes.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!createRes.ok) {
    throw new Error(`POST /api/orders/guest failed: ${createRes.status} ${text}`);
  }

  console.log('✅ Test order created');
  console.log('OrderId:', json?._id);
  console.log('Total:', json?.totalPrice);
  console.log('Status:', json?.orderStatus);
  console.log('Product:', product?.name, productId);
}

main().catch((e) => {
  console.error('❌', e?.message || e);
  process.exit(1);
});
