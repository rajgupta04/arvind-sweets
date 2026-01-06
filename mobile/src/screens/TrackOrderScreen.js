import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { fetchOrderTracking, postTrackingUpdate } from '../services/tracking';

const POLL_MS = 5000; // tracking refresh interval
const PUSH_MS = 5000; // delivery-boy location push interval

function toLatLng(maybe) {
  if (!maybe) return null;
  const lat = Number(maybe.lat ?? maybe.latitude);
  const lng = Number(maybe.lng ?? maybe.longitude ?? maybe.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

export default function TrackOrderScreen({ route }) {
  const { orderId } = route.params;
  const { user } = useAuth();

  const role = user?.role || user?.user?.role;
  const isDeliveryBoy = role === 'delivery' || role === 'delivery-boy' || role === 'rider';

  const [permissionReady, setPermissionReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const pollTimerRef = useRef(null);
  const pushTimerRef = useRef(null);

  const initialRegion = useMemo(() => {
    const base = userLocation || deliveryLocation;
    if (!base) return null;
    return {
      latitude: base.latitude,
      longitude: base.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [userLocation, deliveryLocation]);

  async function ensureLocationPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Location permission is required for tracking');
      return false;
    }
    return true;
  }

  async function refreshTrackingOnce() {
    try {
      setError(null);
      const data = await fetchOrderTracking(orderId);

      // Be flexible with backend shape.
      // Expected: some lat/lng for delivery boy.
      const d1 = toLatLng(data?.deliveryBoyLocation);
      const d2 = toLatLng(data?.deliveryLocation);
      const d3 = toLatLng(data?.deliveryBoy);
      const d4 = toLatLng(data?.rider);

      setDeliveryLocation(d1 || d2 || d3 || d4 || null);
    } catch (e) {
      setError(e?.message || 'Failed to fetch tracking');
    } finally {
      setLoading(false);
    }
  }

  async function refreshUserLocation() {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      // keep silent; map can still render delivery marker.
    }
  }

  useEffect(() => {
    (async () => {
      const ok = await ensureLocationPermission();
      setPermissionReady(ok);
      if (ok) {
        await refreshUserLocation();
      }
      await refreshTrackingOnce();

      pollTimerRef.current = setInterval(() => {
        refreshTrackingOnce();
      }, POLL_MS);
    })();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (pushTimerRef.current) clearInterval(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function startDelivery() {
    if (!permissionReady) {
      const ok = await ensureLocationPermission();
      if (!ok) return;
      setPermissionReady(true);
    }

    setSending(true);

    // Push immediately, then on interval.
    const pushOnce = async () => {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setDeliveryLocation({ latitude: lat, longitude: lng });

      await postTrackingUpdate({ orderId, lat, lng });
    };

    try {
      await pushOnce();
    } catch (e) {
      setSending(false);
      Alert.alert('Start delivery failed', e?.message || '');
      return;
    }

    pushTimerRef.current = setInterval(() => {
      pushOnce().catch(() => {
        // Avoid spamming alerts; server/network hiccups are common on the road.
      });
    }, PUSH_MS);
  }

  function stopDelivery() {
    if (pushTimerRef.current) clearInterval(pushTimerRef.current);
    pushTimerRef.current = null;
    setSending(false);
  }

  if (loading && !initialRegion) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {error ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: 'crimson' }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ padding: 12, gap: 10 }}>
        <Text style={{ fontWeight: '600' }}>Order: {orderId}</Text>

        {isDeliveryBoy ? (
          <View style={{ gap: 10 }}>
            {sending ? (
              <Button title="Stop Delivery" onPress={stopDelivery} />
            ) : (
              <Button title="Start Delivery" onPress={startDelivery} />
            )}
            <Text style={{ opacity: 0.7 }}>
              Delivery mode sends your GPS to the backend every {PUSH_MS / 1000}s.
            </Text>
          </View>
        ) : (
          <Text style={{ opacity: 0.7 }}>
            Customer mode: polling live tracking every {POLL_MS / 1000}s.
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {initialRegion ? (
          <MapView
            style={{ flex: 1 }}
            // Google Maps on iOS requires ios.config.googleMapsApiKey + a dev build.
            // On Android, Google is used automatically.
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion}
          >
            {userLocation ? (
              <Marker coordinate={userLocation} title="You" />
            ) : null}
            {deliveryLocation ? (
              <Marker coordinate={deliveryLocation} title="Delivery" />
            ) : null}
          </MapView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Waiting for location…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
