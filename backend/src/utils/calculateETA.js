import fetch from 'node-fetch';

export default async function calculateETA(userLat, userLng) {
  const SHOP_LAT = Number(process.env.SHOP_LAT);
  const SHOP_LNG = Number(process.env.SHOP_LNG);

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${SHOP_LNG},${SHOP_LAT};${userLng},${userLat}?overview=false`;

  const response = await fetch(osrmUrl);
  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`);
  }
  const data = await response.json();
  const route = data.routes[0];

  const distanceKm = Number((route.distance / 1000).toFixed(2));
  const travelTimeMin = Math.round(route.duration / 60);

  const packing = 10;
  const buffer = 5;

  const totalMinutes = travelTimeMin + packing + buffer;
  const eta = new Date(Date.now() + totalMinutes * 60000);

  return {
    distanceKm,
    travelTimeMin,
    eta,
  };
}
